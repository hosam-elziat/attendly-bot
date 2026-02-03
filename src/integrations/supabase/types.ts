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
      admin_broadcasts: {
        Row: {
          audio_url: string | null
          created_at: string
          created_by: string | null
          failed_sends: number | null
          id: string
          image_url: string | null
          message_text: string
          notes: string | null
          sent_at: string | null
          status: string
          successful_sends: number | null
          target_filter: Json | null
          target_type: string
          total_recipients: number | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          failed_sends?: number | null
          id?: string
          image_url?: string | null
          message_text: string
          notes?: string | null
          sent_at?: string | null
          status?: string
          successful_sends?: number | null
          target_filter?: Json | null
          target_type?: string
          total_recipients?: number | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          failed_sends?: number | null
          id?: string
          image_url?: string | null
          message_text?: string
          notes?: string | null
          sent_at?: string | null
          status?: string
          successful_sends?: number | null
          target_filter?: Json | null
          target_type?: string
          total_recipients?: number | null
        }
        Relationships: []
      }
      approved_holidays: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          days_count: number
          holiday_date: string
          holiday_name: string
          holiday_name_local: string | null
          id: string
          is_approved: boolean | null
          month: number
          notified_at: string | null
          notified_employees: boolean | null
          start_date: string | null
          updated_at: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          days_count?: number
          holiday_date: string
          holiday_name: string
          holiday_name_local?: string | null
          id?: string
          is_approved?: boolean | null
          month: number
          notified_at?: string | null
          notified_employees?: boolean | null
          start_date?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          days_count?: number
          holiday_date?: string
          holiday_name?: string
          holiday_name_local?: string | null
          id?: string
          is_approved?: boolean | null
          month?: number
          notified_at?: string | null
          notified_employees?: boolean | null
          start_date?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "approved_holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          check_in_latitude: number | null
          check_in_location_id: string | null
          check_in_longitude: number | null
          check_in_time: string | null
          check_out_time: string | null
          company_id: string
          created_at: string
          date: string
          early_leave_permission_minutes: number | null
          employee_id: string
          id: string
          late_permission_minutes: number | null
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string
        }
        Insert: {
          check_in_latitude?: number | null
          check_in_location_id?: string | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          company_id: string
          created_at?: string
          date?: string
          early_leave_permission_minutes?: number | null
          employee_id: string
          id?: string
          late_permission_minutes?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
        }
        Update: {
          check_in_latitude?: number | null
          check_in_location_id?: string | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          company_id?: string
          created_at?: string
          date?: string
          early_leave_permission_minutes?: number | null
          employee_id?: string
          id?: string
          late_permission_minutes?: number | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_check_in_location_id_fkey"
            columns: ["check_in_location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
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
      badges: {
        Row: {
          company_id: string
          condition_type: string
          condition_value: number
          created_at: string | null
          description: string | null
          description_ar: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          condition_type: string
          condition_value: number
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_otp_codes: {
        Row: {
          attempts: number | null
          company_id: string
          created_at: string | null
          employee_id: string
          expires_at: string
          id: string
          otp_code: string
          request_type: string
          used_at: string | null
          verification_token: string
        }
        Insert: {
          attempts?: number | null
          company_id: string
          created_at?: string | null
          employee_id: string
          expires_at: string
          id?: string
          otp_code: string
          request_type: string
          used_at?: string | null
          verification_token: string
        }
        Update: {
          attempts?: number | null
          company_id?: string
          created_at?: string | null
          employee_id?: string
          expires_at?: string
          id?: string
          otp_code?: string
          request_type?: string
          used_at?: string | null
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_otp_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_otp_codes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_pending_verifications: {
        Row: {
          biometric_verified_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string | null
          employee_id: string
          expires_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          next_verification_level: number | null
          request_type: string
          telegram_chat_id: string
          verification_purpose: string | null
          verification_token: string
        }
        Insert: {
          biometric_verified_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          employee_id: string
          expires_at: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          next_verification_level?: number | null
          request_type: string
          telegram_chat_id: string
          verification_purpose?: string | null
          verification_token: string
        }
        Update: {
          biometric_verified_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          employee_id?: string
          expires_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          next_verification_level?: number | null
          request_type?: string
          telegram_chat_id?: string
          verification_purpose?: string | null
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_pending_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_pending_verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_verification_logs: {
        Row: {
          company_id: string
          created_at: string | null
          device_info: string | null
          employee_id: string
          id: string
          ip_address: string | null
          success: boolean
          verification_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          device_info?: string | null
          employee_id: string
          id?: string
          ip_address?: string | null
          success: boolean
          verification_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          device_info?: string | null
          employee_id?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_verification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_verification_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_photo_requests: {
        Row: {
          admin_notes: string | null
          bot_username: string
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          photo_url: string | null
          requested_by: string
          requested_by_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          bot_username: string
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          requested_by: string
          requested_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          bot_username?: string
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          requested_by?: string
          requested_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_photo_requests_company_id_fkey"
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
      broadcast_deliveries: {
        Row: {
          broadcast_id: string
          company_id: string
          created_at: string
          employee_id: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          telegram_chat_id: string | null
        }
        Insert: {
          broadcast_id: string
          company_id: string
          created_at?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          telegram_chat_id?: string | null
        }
        Update: {
          broadcast_id?: string
          company_id?: string
          created_at?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          telegram_chat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_deliveries_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "admin_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          biometric_otp_fallback: boolean | null
          biometric_verification_enabled: boolean | null
          break_duration_minutes: number | null
          business_owner_id: string | null
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
          deleted_at: string | null
          deleted_by: string | null
          early_departure_deduction: number | null
          early_departure_grace_minutes: number | null
          early_departure_threshold_minutes: number | null
          emergency_leave_days: number | null
          id: string
          is_deleted: boolean | null
          is_suspended: boolean | null
          join_request_reviewer_id: string | null
          join_request_reviewer_type: string | null
          last_activity_at: string | null
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
          phone: string | null
          rewards_enabled: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
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
          biometric_otp_fallback?: boolean | null
          biometric_verification_enabled?: boolean | null
          break_duration_minutes?: number | null
          business_owner_id?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          early_departure_deduction?: number | null
          early_departure_grace_minutes?: number | null
          early_departure_threshold_minutes?: number | null
          emergency_leave_days?: number | null
          id?: string
          is_deleted?: boolean | null
          is_suspended?: boolean | null
          join_request_reviewer_id?: string | null
          join_request_reviewer_type?: string | null
          last_activity_at?: string | null
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
          phone?: string | null
          rewards_enabled?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
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
          biometric_otp_fallback?: boolean | null
          biometric_verification_enabled?: boolean | null
          break_duration_minutes?: number | null
          business_owner_id?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          early_departure_deduction?: number | null
          early_departure_grace_minutes?: number | null
          early_departure_threshold_minutes?: number | null
          emergency_leave_days?: number | null
          id?: string
          is_deleted?: boolean | null
          is_suspended?: boolean | null
          join_request_reviewer_id?: string | null
          join_request_reviewer_type?: string | null
          last_activity_at?: string | null
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
          phone?: string | null
          rewards_enabled?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          telegram_bot_connected?: boolean | null
          telegram_bot_username?: string | null
          timezone?: string | null
          updated_at?: string
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      company_feature_overrides: {
        Row: {
          company_id: string
          created_at: string | null
          feature_id: string
          id: string
          is_enabled: boolean
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          feature_id: string
          id?: string
          is_enabled?: boolean
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          feature_id?: string
          id?: string
          is_enabled?: boolean
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_feature_overrides_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
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
      company_menu_overrides: {
        Row: {
          company_id: string
          created_at: string | null
          custom_label: string | null
          custom_sort_order: number | null
          id: string
          is_visible: boolean | null
          menu_item_id: string
          visible_to_roles: string[] | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          custom_label?: string | null
          custom_sort_order?: number | null
          id?: string
          is_visible?: boolean | null
          menu_item_id: string
          visible_to_roles?: string[] | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          custom_label?: string | null
          custom_sort_order?: number | null
          id?: string
          is_visible?: boolean | null
          menu_item_id?: string
          visible_to_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "company_menu_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_menu_overrides_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      company_snapshots: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          employees_count: number | null
          id: string
          notes: string | null
          snapshot_data: Json
          snapshot_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          employees_count?: number | null
          id?: string
          notes?: string | null
          snapshot_data: Json
          snapshot_type?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          employees_count?: number | null
          id?: string
          notes?: string | null
          snapshot_data?: Json
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      default_marketplace_items: {
        Row: {
          approval_required: boolean | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          effect_type: string | null
          effect_value: Json | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          item_type: string | null
          name: string
          name_ar: string | null
          points_price: number
        }
        Insert: {
          approval_required?: boolean | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          effect_type?: string | null
          effect_value?: Json | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          item_type?: string | null
          name: string
          name_ar?: string | null
          points_price: number
        }
        Update: {
          approval_required?: boolean | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          effect_type?: string | null
          effect_value?: Json | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          item_type?: string | null
          name?: string
          name_ar?: string | null
          points_price?: number
        }
        Relationships: []
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
      employee_badges: {
        Row: {
          badge_id: string
          company_id: string
          earned_at: string | null
          employee_id: string
          id: string
        }
        Insert: {
          badge_id: string
          company_id: string
          earned_at?: string | null
          employee_id: string
          id?: string
        }
        Update: {
          badge_id?: string
          company_id?: string
          earned_at?: string | null
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_badges_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_inventory: {
        Row: {
          company_id: string
          created_at: string | null
          effect_type: string | null
          effect_value: Json | null
          employee_id: string
          id: string
          is_fully_used: boolean | null
          item_id: string | null
          item_name: string
          item_name_ar: string | null
          item_type: string
          order_id: string | null
          points_paid: number
          purchased_at: string | null
          quantity: number
          updated_at: string | null
          usage_notes: string | null
          used_at: string | null
          used_for_date: string | null
          used_quantity: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          effect_type?: string | null
          effect_value?: Json | null
          employee_id: string
          id?: string
          is_fully_used?: boolean | null
          item_id?: string | null
          item_name: string
          item_name_ar?: string | null
          item_type: string
          order_id?: string | null
          points_paid?: number
          purchased_at?: string | null
          quantity?: number
          updated_at?: string | null
          usage_notes?: string | null
          used_at?: string | null
          used_for_date?: string | null
          used_quantity?: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          effect_type?: string | null
          effect_value?: Json | null
          employee_id?: string
          id?: string
          is_fully_used?: boolean | null
          item_id?: string | null
          item_name?: string
          item_name_ar?: string | null
          item_type?: string
          order_id?: string | null
          points_paid?: number
          purchased_at?: string | null
          quantity?: number
          updated_at?: string | null
          usage_notes?: string | null
          used_at?: string | null
          used_for_date?: string | null
          used_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_inventory_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_inventory_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_item_usage: {
        Row: {
          company_id: string
          employee_id: string
          id: string
          item_id: string
          last_used_at: string | null
          month_year: string | null
          usage_count: number | null
        }
        Insert: {
          company_id: string
          employee_id: string
          id?: string
          item_id: string
          last_used_at?: string | null
          month_year?: string | null
          usage_count?: number | null
        }
        Update: {
          company_id?: string
          employee_id?: string
          id?: string
          item_id?: string
          last_used_at?: string | null
          month_year?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_item_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_item_usage_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_item_usage_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
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
      employee_wallets: {
        Row: {
          company_id: string
          created_at: string | null
          current_level_id: string | null
          earned_points: number | null
          employee_id: string
          id: string
          spent_points: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          current_level_id?: string | null
          earned_points?: number | null
          employee_id: string
          id?: string
          spent_points?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          current_level_id?: string | null
          earned_points?: number | null
          employee_id?: string
          id?: string
          spent_points?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wallets_current_level_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "reward_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wallets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
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
          biometric_credential_id: string | null
          biometric_registered_at: string | null
          biometric_verification_enabled: boolean | null
          break_duration_minutes: number | null
          company_id: string
          created_at: string
          currency: string | null
          department: string | null
          email: string
          emergency_leave_balance: number | null
          full_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_freelancer: boolean
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
          biometric_credential_id?: string | null
          biometric_registered_at?: string | null
          biometric_verification_enabled?: boolean | null
          break_duration_minutes?: number | null
          company_id: string
          created_at?: string
          currency?: string | null
          department?: string | null
          email: string
          emergency_leave_balance?: number | null
          full_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_freelancer?: boolean
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
          biometric_credential_id?: string | null
          biometric_registered_at?: string | null
          biometric_verification_enabled?: boolean | null
          break_duration_minutes?: number | null
          company_id?: string
          created_at?: string
          currency?: string | null
          department?: string | null
          email?: string
          emergency_leave_balance?: number | null
          full_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_freelancer?: boolean
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
      feature_flags: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_enabled_globally: boolean | null
          name: string
          name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled_globally?: boolean | null
          name: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled_globally?: boolean | null
          name?: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      global_backup_settings: {
        Row: {
          auto_backup_enabled: boolean | null
          auto_email_enabled: boolean | null
          backup_frequency_hours: number | null
          backup_hour: number | null
          backup_minute: number | null
          created_at: string
          id: string
          last_auto_backup_at: string | null
          next_auto_backup_at: string | null
          updated_at: string
        }
        Insert: {
          auto_backup_enabled?: boolean | null
          auto_email_enabled?: boolean | null
          backup_frequency_hours?: number | null
          backup_hour?: number | null
          backup_minute?: number | null
          created_at?: string
          id?: string
          last_auto_backup_at?: string | null
          next_auto_backup_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_backup_enabled?: boolean | null
          auto_email_enabled?: boolean | null
          backup_frequency_hours?: number | null
          backup_hour?: number | null
          backup_minute?: number | null
          created_at?: string
          id?: string
          last_auto_backup_at?: string | null
          next_auto_backup_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goal_achievements: {
        Row: {
          achieved_at: string | null
          company_id: string
          employee_id: string
          goal_id: string
          id: string
          notified: boolean | null
          notified_at: string | null
          points_at_achievement: number | null
          reward_given: boolean | null
          reward_given_at: string | null
        }
        Insert: {
          achieved_at?: string | null
          company_id: string
          employee_id: string
          goal_id: string
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          points_at_achievement?: number | null
          reward_given?: boolean | null
          reward_given_at?: string | null
        }
        Update: {
          achieved_at?: string | null
          company_id?: string
          employee_id?: string
          goal_id?: string
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          points_at_achievement?: number | null
          reward_given?: boolean | null
          reward_given_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_achievements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "reward_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_usage_logs: {
        Row: {
          company_id: string
          effect_applied: Json | null
          employee_id: string
          id: string
          inventory_id: string
          manager_notified: boolean | null
          manager_notified_at: string | null
          notes: string | null
          used_at: string | null
          used_for_date: string | null
        }
        Insert: {
          company_id: string
          effect_applied?: Json | null
          employee_id: string
          id?: string
          inventory_id: string
          manager_notified?: boolean | null
          manager_notified_at?: string | null
          notes?: string | null
          used_at?: string | null
          used_for_date?: string | null
        }
        Update: {
          company_id?: string
          effect_applied?: Json | null
          employee_id?: string
          id?: string
          inventory_id?: string
          manager_notified?: boolean | null
          manager_notified_at?: string | null
          notes?: string | null
          used_at?: string | null
          used_for_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "employee_inventory"
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
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          company_id: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          sort_order: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          sort_order?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          approval_required: boolean | null
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          effect_type: string | null
          effect_value: Json | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          item_type: string | null
          name: string
          name_ar: string | null
          points_price: number
          stock_quantity: number | null
          updated_at: string | null
          usage_limit_type: string | null
          usage_limit_value: number | null
        }
        Insert: {
          approval_required?: boolean | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          effect_type?: string | null
          effect_value?: Json | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          item_type?: string | null
          name: string
          name_ar?: string | null
          points_price: number
          stock_quantity?: number | null
          updated_at?: string | null
          usage_limit_type?: string | null
          usage_limit_value?: number | null
        }
        Update: {
          approval_required?: boolean | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          effect_type?: string | null
          effect_value?: Json | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          item_type?: string | null
          name?: string
          name_ar?: string | null
          points_price?: number
          stock_quantity?: number | null
          updated_at?: string | null
          usage_limit_type?: string | null
          usage_limit_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string | null
          employee_id: string
          id: string
          item_id: string
          order_data: Json | null
          points_spent: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          item_id: string
          order_data?: Json | null
          points_spent: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          item_id?: string
          order_data?: Json | null
          points_spent?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string | null
          custom_label: string | null
          feature_flag_id: string | null
          icon: string | null
          id: string
          is_visible_globally: boolean | null
          name: string
          name_ar: string
          parent_id: string | null
          path: string
          sort_order: number | null
          visible_to_roles: string[] | null
        }
        Insert: {
          created_at?: string | null
          custom_label?: string | null
          feature_flag_id?: string | null
          icon?: string | null
          id?: string
          is_visible_globally?: boolean | null
          name: string
          name_ar: string
          parent_id?: string | null
          path: string
          sort_order?: number | null
          visible_to_roles?: string[] | null
        }
        Update: {
          created_at?: string | null
          custom_label?: string | null
          feature_flag_id?: string | null
          icon?: string | null
          id?: string
          is_visible_globally?: boolean | null
          name?: string
          name_ar?: string
          parent_id?: string | null
          path?: string
          sort_order?: number | null
          visible_to_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_messages: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message_ar: string
          message_en: string | null
          message_type: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_ar: string
          message_en?: string | null
          message_type?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_ar?: string
          message_en?: string | null
          message_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motivational_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          verified_location_id: string | null
          verified_location_name: string | null
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
          verified_location_id?: string | null
          verified_location_name?: string | null
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
          verified_location_id?: string | null
          verified_location_name?: string | null
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
          {
            foreignKeyName: "pending_attendance_verified_location_id_fkey"
            columns: ["verified_location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_requests: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          minutes: number
          permission_type: string
          reason: string | null
          request_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          minutes?: number
          permission_type: string
          reason?: string | null
          request_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          minutes?: number
          permission_type?: string
          reason?: string | null
          request_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          feature_id: string
          id: string
          is_included: boolean
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          id?: string
          is_included?: boolean
          plan_id: string
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          id?: string
          is_included?: boolean
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      points_history: {
        Row: {
          added_by: string | null
          added_by_name: string | null
          company_id: string
          created_at: string | null
          description: string | null
          employee_id: string
          event_type: string
          id: string
          points: number
          reference_id: string | null
          source: string
        }
        Insert: {
          added_by?: string | null
          added_by_name?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          employee_id: string
          event_type: string
          id?: string
          points: number
          reference_id?: string | null
          source: string
        }
        Update: {
          added_by?: string | null
          added_by_name?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string
          event_type?: string
          id?: string
          points?: number
          reference_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_history_employee_id_fkey"
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
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
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
      revenue_transactions: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          payment_method: string | null
          reference_id: string | null
          status: string | null
          subscription_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_id?: string | null
          status?: string | null
          subscription_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_id?: string | null
          status?: string | null
          subscription_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_event_tracking: {
        Row: {
          company_id: string
          created_at: string | null
          employee_id: string
          event_count: number | null
          event_date: string
          event_type: string
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          employee_id: string
          event_count?: number | null
          event_date: string
          event_type: string
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          employee_id?: string
          event_count?: number | null
          event_date?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_event_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_event_tracking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_goals: {
        Row: {
          announced_at: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          description_ar: string | null
          duration_type: string
          end_date: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          is_announced: boolean | null
          name: string
          name_ar: string | null
          points_threshold: number
          reward_description: string | null
          reward_description_ar: string | null
          reward_item_id: string | null
          reward_points: number | null
          reward_type: string
          start_date: string | null
          updated_at: string | null
          winner_announced_at: string | null
          winner_id: string | null
        }
        Insert: {
          announced_at?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          duration_type?: string
          end_date?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          is_announced?: boolean | null
          name: string
          name_ar?: string | null
          points_threshold?: number
          reward_description?: string | null
          reward_description_ar?: string | null
          reward_item_id?: string | null
          reward_points?: number | null
          reward_type?: string
          start_date?: string | null
          updated_at?: string | null
          winner_announced_at?: string | null
          winner_id?: string | null
        }
        Update: {
          announced_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          duration_type?: string
          end_date?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          is_announced?: boolean | null
          name?: string
          name_ar?: string | null
          points_threshold?: number
          reward_description?: string | null
          reward_description_ar?: string | null
          reward_item_id?: string | null
          reward_points?: number | null
          reward_type?: string
          start_date?: string | null
          updated_at?: string | null
          winner_announced_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_goals_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_goals_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_levels: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level_order: number
          min_points: number
          name: string
          name_ar: string | null
          perks: Json | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_order?: number
          min_points?: number
          name: string
          name_ar?: string | null
          perks?: Json | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_order?: number
          min_points?: number
          name?: string
          name_ar?: string | null
          perks?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_messages: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message_template: string
          message_type: string
          time_of_day: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          message_type: string
          time_of_day?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          message_type?: string
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_rules: {
        Row: {
          company_id: string
          created_at: string | null
          daily_limit: number | null
          description: string | null
          event_name: string
          event_name_ar: string | null
          event_type: string
          id: string
          is_enabled: boolean | null
          monthly_limit: number | null
          points_value: number
          updated_at: string | null
          weekly_limit: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          event_name: string
          event_name_ar?: string | null
          event_type: string
          id?: string
          is_enabled?: boolean | null
          monthly_limit?: number | null
          points_value?: number
          updated_at?: string | null
          weekly_limit?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          daily_limit?: number | null
          description?: string | null
          event_name?: string
          event_name_ar?: string | null
          event_type?: string
          id?: string
          is_enabled?: boolean | null
          monthly_limit?: number | null
          points_value?: number
          updated_at?: string | null
          weekly_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_leaderboard: {
        Row: {
          company_id: string
          employee_id: string
          id: string
          period_type: string
          period_value: string
          rank: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          employee_id: string
          id?: string
          period_type: string
          period_value: string
          rank?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          employee_id?: string
          id?: string
          period_type?: string
          period_value?: string
          rank?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_leaderboard_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_leaderboard_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      scheduled_leaves: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          end_date: string | null
          id: string
          leave_date: string
          leave_name: string
          leave_type: string
          notified_at: string | null
          reason: string | null
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          end_date?: string | null
          id?: string
          leave_date: string
          leave_name: string
          leave_type?: string
          notified_at?: string | null
          reason?: string | null
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          end_date?: string | null
          id?: string
          leave_date?: string
          leave_name?: string
          leave_type?: string
          notified_at?: string | null
          reason?: string | null
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_leaves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_messages: {
        Row: {
          company_id: string
          created_at: string | null
          delivered_at: string | null
          id: string
          is_anonymous: boolean | null
          is_delivered: boolean | null
          message_content: string
          order_id: string
          recipient_id: string | null
          recipient_type: string
          sender_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_delivered?: boolean | null
          message_content: string
          order_id: string
          recipient_id?: string | null
          recipient_type: string
          sender_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_delivered?: boolean | null
          message_content?: string
          order_id?: string
          recipient_id?: string | null
          recipient_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secret_messages_sender_id_fkey"
            columns: ["sender_id"]
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
      super_admin_activity_logs: {
        Row: {
          action: string
          action_type: string
          admin_email: string | null
          admin_id: string
          admin_name: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          request_method: string | null
          session_id: string | null
          severity: string | null
          target_id: string | null
          target_name: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          action_type: string
          admin_email?: string | null
          admin_id: string
          admin_name?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          request_method?: string | null
          session_id?: string | null
          severity?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          admin_name?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          request_method?: string | null
          session_id?: string | null
          severity?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      system_activity_feed: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          event_category: string
          event_type: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          severity: string | null
          title: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          event_category: string
          event_type: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          severity?: string | null
          title: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          event_category?: string
          event_type?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          severity?: string | null
          title?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activity_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          company_id: string | null
          company_name: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          webhook_secret: string | null
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
          webhook_secret?: string | null
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
          webhook_secret?: string | null
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
      telegram_messages: {
        Row: {
          company_id: string
          created_at: string
          direction: string
          employee_id: string
          id: string
          message_text: string
          message_type: string | null
          metadata: Json | null
          telegram_chat_id: string
          telegram_message_id: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          direction: string
          employee_id: string
          id?: string
          message_text: string
          message_type?: string | null
          metadata?: Json | null
          telegram_chat_id: string
          telegram_message_id?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          direction?: string
          employee_id?: string
          id?: string
          message_text?: string
          message_type?: string | null
          metadata?: Json | null
          telegram_chat_id?: string
          telegram_message_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_messages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          email: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string | null
          logged_in_at: string | null
          logged_out_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          email?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          logged_in_at?: string | null
          logged_out_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          email?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          logged_in_at?: string | null
          logged_out_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: {
          p_added_by?: string
          p_added_by_name?: string
          p_company_id: string
          p_description?: string
          p_employee_id: string
          p_event_type: string
          p_points: number
          p_reference_id?: string
          p_source?: string
        }
        Returns: Json
      }
      belongs_to_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      can_earn_reward: {
        Args: {
          p_company_id: string
          p_employee_id: string
          p_event_date?: string
          p_event_type: string
        }
        Returns: Json
      }
      can_manage_employee: {
        Args: { manager_employee_id: string; target_employee_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_biometric_data: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      get_employee_managers: {
        Args: { emp_id: string }
        Returns: {
          manager_employee_id: string
          manager_name: string
          manager_position_id: string
          manager_telegram_chat_id: string
        }[]
      }
      get_employee_rank: {
        Args: {
          p_company_id: string
          p_employee_id: string
          p_period_type?: string
        }
        Returns: number
      }
      get_permission_usage_today: {
        Args: {
          p_date: string
          p_employee_id: string
          p_permission_type: string
        }
        Returns: number
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
      increment_event_count: {
        Args: {
          p_employee_id: string
          p_event_date: string
          p_event_type: string
        }
        Returns: undefined
      }
      is_admin_or_owner: { Args: { p_user_id: string }; Returns: boolean }
      is_feature_enabled: {
        Args: { p_company_id: string; p_feature_name: string }
        Returns: boolean
      }
      is_saas_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_saas_team_member: { Args: { p_user_id: string }; Returns: boolean }
      log_system_event: {
        Args: {
          p_company_id?: string
          p_company_name?: string
          p_description?: string
          p_event_category: string
          p_event_type: string
          p_metadata?: Json
          p_severity?: string
          p_title: string
          p_user_email?: string
          p_user_id?: string
        }
        Returns: string
      }
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
