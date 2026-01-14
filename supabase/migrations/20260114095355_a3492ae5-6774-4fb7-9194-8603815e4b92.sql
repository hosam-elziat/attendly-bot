-- Create function to get all subordinate positions (recursive)
CREATE OR REPLACE FUNCTION get_subordinate_positions(manager_position_id uuid)
RETURNS TABLE(position_id uuid) 
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    -- Base case: Direct reports from junction table
    SELECT ptr.position_id as pos_id
    FROM position_reports_to ptr
    WHERE ptr.reports_to_position_id = manager_position_id
    
    UNION
    
    -- Base case: Direct reports from legacy reports_to column
    SELECT p.id as pos_id
    FROM positions p
    WHERE p.reports_to = manager_position_id
    
    UNION
    
    -- Recursive case
    SELECT sub.pos_id
    FROM (
      SELECT ptr.position_id as pos_id, ptr.reports_to_position_id as parent_id
      FROM position_reports_to ptr
      UNION
      SELECT p.id as pos_id, p.reports_to as parent_id
      FROM positions p
      WHERE p.reports_to IS NOT NULL
    ) sub
    INNER JOIN subordinates s ON sub.parent_id = s.pos_id
  )
  SELECT DISTINCT pos_id FROM subordinates;
END;
$$;

-- Create function to get all subordinate employees
CREATE OR REPLACE FUNCTION get_subordinate_employees(manager_employee_id uuid)
RETURNS TABLE(employee_id uuid) 
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  manager_position_id uuid;
BEGIN
  -- Get manager's position
  SELECT e.position_id INTO manager_position_id
  FROM employees e
  WHERE e.id = manager_employee_id;
  
  IF manager_position_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return employees in subordinate positions
  RETURN QUERY
  SELECT e.id
  FROM employees e
  WHERE e.position_id IN (SELECT get_subordinate_positions(manager_position_id))
  AND e.is_active = true;
END;
$$;

-- Create function to get direct managers for an employee
CREATE OR REPLACE FUNCTION get_employee_managers(emp_id uuid)
RETURNS TABLE(manager_employee_id uuid, manager_telegram_chat_id text, manager_name text, manager_position_id uuid) 
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  emp_position_id uuid;
BEGIN
  -- Get employee's position
  SELECT e.position_id INTO emp_position_id
  FROM employees e
  WHERE e.id = emp_id;
  
  IF emp_position_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get managers from new junction table and legacy column
  RETURN QUERY
  SELECT DISTINCT e.id, e.telegram_chat_id, e.full_name, e.position_id
  FROM employees e
  JOIN position_reports_to ptr ON e.position_id = ptr.reports_to_position_id
  WHERE ptr.position_id = emp_position_id
  AND e.is_active = true
  AND e.telegram_chat_id IS NOT NULL
  
  UNION
  
  -- Legacy: managers from reports_to column
  SELECT DISTINCT e.id, e.telegram_chat_id, e.full_name, e.position_id
  FROM employees e
  WHERE e.position_id = (SELECT p.reports_to FROM positions p WHERE p.id = emp_position_id)
  AND e.is_active = true
  AND e.telegram_chat_id IS NOT NULL;
END;
$$;