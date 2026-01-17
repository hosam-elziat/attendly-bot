export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          company_id: string
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          company_id: string
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_policies: {
        Row: {
          company_id: string
          created_at: string
          deduction_amount: number
          id: string
          is_active: boolean | null
          late_threshold_minutes: number
          policy_description: string | null
          policy_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deduction_amount?: number
          id?: string
          is_active?: boolean | null
          late_threshold_minutes?: number
          policy_description?: string | null
          policy_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deduction_amount?: number
          id?: string
          is_active?: boolean | null
          late_threshold_minutes?: number
          policy_description?: string | null
          policy_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          company_id: string
          created_at: string
          description: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_email_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      backup_settings: {
        Row: {
          company_id: string | null
          created_at: string
          email_address: string | null
          email_enabled: boolean | null
          frequency: string | null
          id: string
          is_active: boolean | null
          last_backup_at: string | null
          next_backup_at: string | null
          retention_days: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_backup_at?: string | null
          next_backup_at?: string | null
          retention_days?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_backup_at?: string | null
          next_backup_at?: string | null
          retention_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          backup_data: Json
          backup_type: string
          company_id: string | null
          created_at: string
          created_by: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          notes: string | null
          size_bytes: number | null
          status: string
          tables_included: string[]
        }
        Insert: {
          backup_data: Json
          backup_type?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          tables_included: string[]
        }
        Update: {
          backup_data?: Json
          backup_type?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          tables_included?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "backups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      break_logs: {
        Row: {
          attendance_id: string
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          start_time: string
        }
        Insert: {
          attendance_id: string
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          start_time?: string
        }
        Update: {
          attendance_id?: string
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "break_logs_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          absence_without_permission_deduction: number | null
          annual_leave_days: number | null
          attendance_approver_id: string | null
          attendance_approver_type: string | null
          attendance_verification_level: number | null
          auto_absent_after_hours: number | null
          break_duration_minutes: number | null
          checkin_reminder_count: number | null
          checkin_reminder_interval_minutes: number | null
          checkout_reminder_count: number | null
          checkout_reminder_interval_minutes: number | null
          company_latitude: number | null
          company_longitude: number | null
          country_code: string | null
          created_at: string
          daily_late_allowance_minutes: number | null
          default_currency: string | null
          default_weekend_days: string[] | null
          emergency_leave_days: number | null
          id: string
          join_request_reviewer_id: string | null
          join_request_reviewer_type: string | null
          late_15_to_30_deduction: number | null
          late_over_30_deduction: number | null
          late_under_15_deduction: number | null
          level3_verification_mode: string | null
          location_radius_meters: number | null
          max_excused_absence_days: number | null
          monthly_late_allowance_minutes: number | null
          name: string
          overtime_multiplier: number | null
          owner_id: string
          telegram_bot_connected: boolean | null
          telegram_bot_username: string | null
          timezone: string | null
          updated_at: string
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          absence_without_permission_deduction?: number | null
          annual_leave_days?: number | null
          attendance_approver_id?: string | null
          attendance_approver_type?: string | null
          attendance_verification_level?: number | null
          auto_absent_after_hours?: number | null
          break_duration_minutes?: number | null
          checkin_reminder_count?: number | null
          checkin_reminder_interval_minutes?: number | null
          checkout_reminder_count?: number | null
          checkout_reminder_interval_minutes?: number | null
          company_latitude?: number | null
          company_longitude?: number | null
          country_code?: string | null
          created_at?: string
          daily_late_allowance_minutes?: number | null
          default_currency?: string | null
          default_weekend_days?: string[] | null
          emergency_leave_days?: number | null
          id?: string
          join_request_reviewer_id?: string | null
          join_request_reviewer_type?: string | null
          late_15_to_30_deduction?: number | null
          late_over_30_deduction?: number | null
          late_under_15_deduction?: number | null
          level3_verification_mode?: string | null
          location_radius_meters?: number | null
          max_excused_absence_days?: number | null
          monthly_late_allowance_minutes?: number | null
          name: string
          overtime_multiplier?: number | null
          owner_id: string
          telegram_bot_connected?: boolean | null
          telegram_bot_username?: string | null
          timezone?: string | null
          updated_at?: string
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          absence_without_permission_deduction?: number | null
          annual_leave_days?: number | null
          attendance_approver_id?: string | null
          attendance_approver_type?: string | null
          attendance_verification_level?: number | null
          auto_absent_after_hours?: number | null
          break_duration_minutes?: number | null
          checkin_reminder_count?: number | null
          checkin_reminder_interval_minutes?: number | null
          checkout_reminder_count?: number | null
          checkout_reminder_interval_minutes?: number | null
          company_latitude?: number | null
          company_longitude?: number | null
          country_code?: string | null
          created_at?: string
          daily_late_allowance_minutes?: number | null
          default_currency?: string | null
          default_weekend_days?: string[] | null
          emergency_leave_days?: number | null
          id?: string
          join_request_reviewer_id?: string | null
          join_request_reviewer_type?: string | null
          late_15_to_30_deduction?: number | null
          late_over_30_deduction?: number | null
          late_under_15_deduction?: number | null
          level3_verification_mode?: string | null
          location_radius_meters?: number | null
          max_excused_absence_days?: number | null
          monthly_late_allowance_minutes?: number | null
          name?: string
          overtime_multiplier?: number | null
          owner_id?: string
          telegram_bot_connected?: boolean | null
          telegram_bot_username?: string | null
          timezone?: string | null
          updated_at?: string
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      company_locations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_records: {
        Row: {
          company_id: string
          deleted_at: string
          deleted_by: string
          id: string
          is_restored: boolean | null
          record_data: Json
          record_id: string
          restored_at: string | null
          table_name: string
        }
        Insert: {
          company_id: string
          deleted_at?: string
          deleted_by: string
          id?: string
          is_restored?: boolean | null
          record_data: Json
          record_id: string
          restored_at?: string | null
          table_name: string
        }
        Update: {
          company_id?: string
          deleted_at?: string
          deleted_by?: string
          id?: string
          is_restored?: boolean | null
          record_data?: Json
          record_id?: string
          restored_at?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      employee_location_history: {
        Row: {
          company_id: string
          employee_id: string
          id: string
          ip_address: string | null
          is_suspicious: boolean | null
          latitude: number
          longitude: number
          recorded_at: string
          suspicion_reason: string | null
        }
        Insert: {
          company_id: string
          employee_id: string
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          latitude: number
          longitude: number
          recorded_at?: string
          suspicion_reason?: string | null
        }
        Update: {
          company_id?: string
          employee_id?: string
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          suspicion_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_location_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_location_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_locations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          location_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          location_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          allowed_wifi_ips: string[] | null
          attendance_approver_id: string | null
          attendance_approver_type: string | null
          attendance_verification_level: number | null
          base_salary: number | null
          break_duration_minutes: number | null
          company_id: string
          created_at: string
          currency: string | null
          department: string | null
          email: string
          emergency_leave_balance: number | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          leave_balance: number | null
          level3_verification_mode: string | null
          monthly_late_balance_minutes: number | null
          national_id: string | null
          notes: string | null
          phone: string | null
          position_id: string | null
          salary_type: Database["public"]["Enums"]["salary_type"] | null
          telegram_chat_id: string | null
          updated_at: string
          user_id: string | null
          weekend_days: string[] | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          address?: string | null
          allowed_wifi_ips?: string[] | null
          attendance_approver_id?: string | null
          attendance_approver_type?: string | null
          attendance_verification_level?: number | null
          base_salary?: number | null
          break_duration_minutes?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          department?: string | null
          email: string
          emergency_leave_balance?: number | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          leave_balance?: number | null
          level3_verification_mode?: string | null
          monthly_late_balance_minutes?: number | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string | null
          weekend_days?: string[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          address?: string | null
          allowed_wifi_ips?: string[] | null
          attendance_approver_id?: string | null
          attendance_approver_type?: string | null
          attendance_verification_level?: number | null
          base_salary?: number | null
          break_duration_minutes?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          department?: string | null
          email?: string
          emergency_leave_balance?: number | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          leave_balance?: number | null
          level3_verification_mode?: string | null
          monthly_late_balance_minutes?: number | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          position_id?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string | null
          weekend_days?: string[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      join_request_reviewers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          reviewer_id: string
          reviewer_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          reviewer_id: string
          reviewer_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          reviewer_id?: string
          reviewer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_request_reviewers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          national_id: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          telegram_chat_id: string
          telegram_username: string | null
          updated_at: string
          weekend_days: string[] | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          national_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_chat_id: string
          telegram_username?: string | null
          updated_at?: string
          weekend_days?: string[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          national_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_chat_id?: string
          telegram_username?: string | null
          updated_at?: string
          weekend_days?: string[] | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days: number
          employee_id: string
          end_date: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_attendance: {
        Row: {
          approved_time: string | null
          approver_id: string | null
          approver_type: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          ip_address: string | null
          ip_verified: boolean | null
          latitude: number | null
          location_spoofing_suspected: boolean | null
          location_verified: boolean | null
          longitude: number | null
          notes: string | null
          rejection_reason: string | null
          request_type: string
          requested_at: string
          requested_time: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          selfie_verified: boolean | null
          status: string
          telegram_message_id: number | null
          updated_at: string
          vpn_detected: boolean | null
        }
        Insert: {
          approved_time?: string | null
          approver_id?: string | null
          approver_type?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          ip_address?: string | null
          ip_verified?: boolean | null
          latitude?: number | null
          location_spoofing_suspected?: boolean | null
          location_verified?: boolean | null
          longitude?: number | null
          notes?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_at?: string
          requested_time: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          selfie_verified?: boolean | null
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
          vpn_detected?: boolean | null
        }
        Update: {
          approved_time?: string | null
          approver_id?: string | null
          approver_type?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          ip_address?: string | null
          ip_verified?: boolean | null
          latitude?: number | null
          location_spoofing_suspected?: boolean | null
          location_verified?: boolean | null
          longitude?: number | null
          notes?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_at?: string
          requested_time?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          selfie_verified?: boolean | null
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
          vpn_detected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      position_permissions: {
        Row: {
          can_add_bonuses: boolean | null
          can_approve_leaves: boolean | null
          can_make_deductions: boolean | null
          can_manage_attendance: boolean | null
          can_manage_subordinates: boolean | null
          can_view_reports: boolean | null
          can_view_salaries: boolean | null
          created_at: string
          id: string
          position_id: string
          updated_at: string
        }
        Insert: {
          can_add_bonuses?: boolean | null
          can_approve_leaves?: boolean | null
          can_make_deductions?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_subordinates?: boolean | null
          can_view_reports?: boolean | null
          can_view_salaries?: boolean | null
          created_at?: string
          id?: string
          position_id: string
          updated_at?: string
        }
        Update: {
          can_add_bonuses?: boolean | null
          can_approve_leaves?: boolean | null
          can_make_deductions?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_subordinates?: boolean | null
          can_view_reports?: boolean | null
          can_view_salaries?: boolean | null
          created_at?: string
          id?: string
          position_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_permissions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: true
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      position_reports_to: {
        Row: {
          created_at: string
          id: string
          position_id: string
          reports_to_position_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_id: string
          reports_to_position_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_id?: string
          reports_to_position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_reports_to_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_reports_to_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          level: number | null
          reports_to: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          reports_to?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          reports_to?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          language: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          language?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          language?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_sessions: {
        Row: {
          company_id: string
          created_at: string
          data: Json
          expires_at: string
          id: string
          step: string
          telegram_chat_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          step?: string
          telegram_chat_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          step?: string
          telegram_chat_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_team: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_adjustments: {
        Row: {
          added_by: string | null
          added_by_name: string | null
          adjustment_days: number | null
          attendance_log_id: string | null
          bonus: number | null
          company_id: string
          created_at: string
          deduction: number | null
          description: string | null
          employee_id: string
          id: string
          is_auto_generated: boolean | null
          month: string
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          added_by_name?: string | null
          adjustment_days?: number | null
          attendance_log_id?: string | null
          bonus?: number | null
          company_id: string
          created_at?: string
          deduction?: number | null
          description?: string | null
          employee_id: string
          id?: string
          is_auto_generated?: boolean | null
          month: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          added_by_name?: string | null
          adjustment_days?: number | null
          attendance_log_id?: string | null
          bonus?: number | null
          company_id?: string
          created_at?: string
          deduction?: number | null
          description?: string | null
          employee_id?: string
          id?: string
          is_auto_generated?: boolean | null
          month?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_adjustments_attendance_log_id_fkey"
            columns: ["attendance_log_id"]
            isOneToOne: false
            referencedRelation: "attendance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          base_salary: number | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          month: string
          net_salary: number | null
          paid_at: string | null
          status: string | null
          total_bonus: number | null
          total_days: number | null
          total_deductions: number | null
          work_days: number | null
        }
        Insert: {
          base_salary?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          month: string
          net_salary?: number | null
          paid_at?: string | null
          status?: string | null
          total_bonus?: number | null
          total_days?: number | null
          total_deductions?: number | null
          work_days?: number | null
        }
        Update: {
          base_salary?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          month?: string
          net_salary?: number | null
          paid_at?: string | null
          status?: string | null
          total_bonus?: number | null
          total_days?: number | null
          total_deductions?: number | null
          work_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_unlimited: boolean | null
          max_employees: number | null
          min_employees: number
          name: string
          name_ar: string | null
          price_monthly: number
          price_quarterly: number | null
          price_yearly: number | null
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_unlimited?: boolean | null
          max_employees?: number | null
          min_employees?: number
          name: string
          name_ar?: string | null
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number | null
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_unlimited?: boolean | null
          max_employees?: number | null
          min_employees?: number
          name?: string
          name_ar?: string | null
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number | null
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          discount_code_id: string | null
          id: string
          max_employees: number | null
          plan_id: string | null
          plan_name: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_code_id?: string | null
          id?: string
          max_employees?: number | null
          plan_id?: string | null
          plan_name?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_code_id?: string | null
          id?: string
          max_employees?: number | null
          plan_id?: string | null
          plan_name?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bots: {
        Row: {
          assigned_at: string | null
          assigned_company_id: string | null
          bot_name: string | null
          bot_token: string
          bot_username: string
          created_at: string
          id: string
          is_available: boolean | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_company_id?: string | null
          bot_name?: string | null
          bot_token: string
          bot_username: string
          created_at?: string
          id?: string
          is_available?: boolean | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_company_id?: string | null
          bot_name?: string | null
          bot_token?: string
          bot_username?: string
          created_at?: string
          id?: string
          is_available?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bots_assigned_company_id_fkey"
            columns: ["assigned_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      belongs_to_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_employee: {
        Args: { manager_employee_id: string; target_employee_id: string }
        Returns: boolean
      }
      get_employee_managers: {
        Args: { emp_id: string }
        Returns: {
          manager_employee_id: string
          manager_name: string
          manager_position_id: string
          manager_telegram_chat_id: string
        }[]
      }
      get_saas_team_permissions: { Args: { p_user_id: string }; Returns: Json }
      get_subordinate_employees: {
        Args: { manager_employee_id: string }
        Returns: {
          employee_id: string
        }[]
      }
      get_subordinate_positions: {
        Args: { manager_position_id: string }
        Returns: {
          position_id: string
        }[]
      }
      get_user_company_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: { p_user_id: string }; Returns: boolean }
      is_saas_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_saas_team_member: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      attendance_status: "checked_in" | "on_break" | "checked_out" | "absent"
      audit_action: "insert" | "update" | "delete" | "restore"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "vacation" | "sick" | "personal" | "emergency" | "regular"
      salary_type: "monthly" | "daily"
      subscription_status: "active" | "inactive" | "trial" | "cancelled"
      user_role:
        | "owner"
        | "admin"
        | "manager"
        | "employee"
        | "super_admin"
        | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["checked_in", "on_break", "checked_out", "absent"],
      audit_action: ["insert", "update", "delete", "restore"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["vacation", "sick", "personal", "emergency", "regular"],
      salary_type: ["monthly", "daily"],
      subscription_status: ["active", "inactive", "trial", "cancelled"],
      user_role: [
        "owner",
        "admin",
        "manager",
        "employee",
        "super_admin",
        "support",
      ],
    },
  },
} as const
