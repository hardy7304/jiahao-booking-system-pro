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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          addon_type: string | null
          applicable_categories: string[] | null
          created_at: string | null
          deduction: number | null
          extra_duration: number | null
          extra_price: number | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          store_id: string
        }
        Insert: {
          addon_type?: string | null
          applicable_categories?: string[] | null
          created_at?: string | null
          deduction?: number | null
          extra_duration?: number | null
          extra_price?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          store_id: string
        }
        Update: {
          addon_type?: string | null
          applicable_categories?: string[] | null
          created_at?: string | null
          deduction?: number | null
          extra_duration?: number | null
          extra_price?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons: string[] | null
          admin_note: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          coach_id: string | null
          completed_at: string | null
          created_at: string
          date: string
          duration: number
          google_calendar_event_id: string | null
          id: string
          name: string
          needs_pair: boolean
          oil_bonus: number
          order_time: string
          phone: string
          service: string
          source: string | null
          start_hour: number
          start_time_str: string
          status: string | null
          store_id: string
          secondary_coach_id: string | null
          symptom_tags: string[]
          total_price: number
        }
        Insert: {
          addons?: string[] | null
          admin_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          coach_id?: string | null
          completed_at?: string | null
          created_at?: string
          date: string
          duration: number
          google_calendar_event_id?: string | null
          id?: string
          name: string
          needs_pair?: boolean
          oil_bonus?: number
          order_time?: string
          phone: string
          service: string
          source?: string | null
          start_hour: number
          start_time_str: string
          status?: string | null
          store_id: string
          secondary_coach_id?: string | null
          symptom_tags?: string[]
          total_price: number
        }
        Update: {
          addons?: string[] | null
          admin_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          coach_id?: string | null
          completed_at?: string | null
          created_at?: string
          date?: string
          duration?: number
          google_calendar_event_id?: string | null
          id?: string
          name?: string
          needs_pair?: boolean
          oil_bonus?: number
          order_time?: string
          phone?: string
          service?: string
          source?: string | null
          start_hour?: number
          start_time_str?: string
          status?: string | null
          store_id?: string
          secondary_coach_id?: string | null
          symptom_tags?: string[]
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_secondary_coach_id_fkey"
            columns: ["secondary_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          available_today: boolean
          available_tonight: boolean
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          landing_visible: boolean
          name: string
          password_hash: string | null
          phone: string | null
          portrait_url: string | null
          shift_end_hour: number
          shift_start_hour: number
          specialty: string | null
          store_id: string | null
        }
        Insert: {
          available_today?: boolean
          available_tonight?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          landing_visible?: boolean
          name: string
          password_hash?: string | null
          phone?: string | null
          portrait_url?: string | null
          shift_end_hour?: number
          shift_start_hour?: number
          specialty?: string | null
          store_id?: string | null
        }
        Update: {
          available_today?: boolean
          available_tonight?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          landing_visible?: boolean
          name?: string
          password_hash?: string | null
          phone?: string | null
          portrait_url?: string | null
          shift_end_hour?: number
          shift_start_hour?: number
          specialty?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_custom_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string
          id: string
          is_active: boolean | null
          options: string[] | null
          sort_order: number | null
          store_id: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          options?: string[] | null
          sort_order?: number | null
          store_id: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          options?: string[] | null
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_custom_fields_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_field_values: {
        Row: {
          created_at: string | null
          customer_id: string
          field_id: string
          id: string
          store_id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          field_id: string
          id?: string
          store_id: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          field_id?: string
          id?: string
          store_id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_field_values_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "customer_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_field_values_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string | null
          customer_id: string
          id: string
          store_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          customer_id: string
          id?: string
          store_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          store_id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          store_id: string
          tag: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          store_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          allergy_notes: string | null
          area: string | null
          birthday: string | null
          blacklist_action: string
          blacklist_reason: string | null
          cancel_count: number
          created_at: string | null
          email: string | null
          id: string
          is_blacklisted: boolean
          last_visit_date: string | null
          line_id: string | null
          name: string
          no_show_count: number
          phone: string
          pressure_preference: string | null
          store_id: string
          updated_at: string | null
          visit_count: number
        }
        Insert: {
          allergy_notes?: string | null
          area?: string | null
          birthday?: string | null
          blacklist_action?: string
          blacklist_reason?: string | null
          cancel_count?: number
          created_at?: string | null
          email?: string | null
          id?: string
          is_blacklisted?: boolean
          last_visit_date?: string | null
          line_id?: string | null
          name?: string
          no_show_count?: number
          phone: string
          pressure_preference?: string | null
          store_id: string
          updated_at?: string | null
          visit_count?: number
        }
        Update: {
          allergy_notes?: string | null
          area?: string | null
          birthday?: string | null
          blacklist_action?: string
          blacklist_reason?: string | null
          cancel_count?: number
          created_at?: string | null
          email?: string | null
          id?: string
          is_blacklisted?: boolean
          last_visit_date?: string | null
          line_id?: string | null
          name?: string
          no_show_count?: number
          phone?: string
          pressure_preference?: string | null
          store_id?: string
          updated_at?: string | null
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          end_hour: number | null
          google_calendar_event_id: string | null
          id: string
          note: string | null
          start_hour: number | null
          store_id: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          end_hour?: number | null
          google_calendar_event_id?: string | null
          id?: string
          note?: string | null
          start_hour?: number | null
          store_id: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string
          end_hour?: number | null
          google_calendar_event_id?: string | null
          id?: string
          note?: string | null
          start_hour?: number | null
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      line_message_log: {
        Row: {
          booking_id: string | null
          cost_counted: boolean | null
          customer_phone: string | null
          error_message: string | null
          id: string
          line_user_id: string | null
          message_type: string
          sent_at: string | null
          store_id: string
          success: boolean | null
        }
        Insert: {
          booking_id?: string | null
          cost_counted?: boolean | null
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          line_user_id?: string | null
          message_type: string
          sent_at?: string | null
          store_id: string
          success?: boolean | null
        }
        Update: {
          booking_id?: string | null
          cost_counted?: boolean | null
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          line_user_id?: string | null
          message_type?: string
          sent_at?: string | null
          store_id?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "line_message_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_message_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          deduction: number | null
          duration: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          store_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          deduction?: number | null
          duration: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          store_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          deduction?: number | null
          duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_email: string | null
          phone: string | null
          plan: string | null
          settings: Json | null
          slug: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_email?: string | null
          phone?: string | null
          plan?: string | null
          settings?: Json | null
          slug: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_email?: string | null
          phone?: string | null
          plan?: string | null
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          anping_section_body: string | null
          anping_section_title: string | null
          boxing_cta_label: string | null
          boxing_cta_url: string | null
          boxing_section_body: string | null
          boxing_section_title: string | null
          brand_stats_subtitle: string | null
          brand_stats_title: string | null
          business_hours_display: string | null
          created_at: string
          footer_cta_body: string | null
          footer_cta_title: string | null
          hero_hours_badge_short: string | null
          hero_late_night_note: string | null
          hero_starting_price_label: string | null
          hero_subtitle: string | null
          hero_title: string | null
          is_roushou_visible: boolean
          roushou_intro: string | null
          roushou_section_body: string | null
          roushou_section_title: string | null
          services: Json
          stats: Json
          store_id: string
          studios_shell: Json
          therapist_highlights: Json
          therapist_section_body: string | null
          therapist_section_title: string | null
          therapist_tags_line: string | null
          updated_at: string
        }
        Insert: {
          anping_section_body?: string | null
          anping_section_title?: string | null
          boxing_cta_label?: string | null
          boxing_cta_url?: string | null
          boxing_section_body?: string | null
          boxing_section_title?: string | null
          brand_stats_subtitle?: string | null
          brand_stats_title?: string | null
          business_hours_display?: string | null
          created_at?: string
          footer_cta_body?: string | null
          footer_cta_title?: string | null
          hero_hours_badge_short?: string | null
          hero_late_night_note?: string | null
          hero_starting_price_label?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          is_roushou_visible?: boolean
          roushou_intro?: string | null
          roushou_section_body?: string | null
          roushou_section_title?: string | null
          services?: Json
          stats?: Json
          store_id: string
          studios_shell?: Json
          therapist_highlights?: Json
          therapist_section_body?: string | null
          therapist_section_title?: string | null
          therapist_tags_line?: string | null
          updated_at?: string
        }
        Update: {
          anping_section_body?: string | null
          anping_section_title?: string | null
          boxing_cta_label?: string | null
          boxing_cta_url?: string | null
          boxing_section_body?: string | null
          boxing_section_title?: string | null
          brand_stats_subtitle?: string | null
          brand_stats_title?: string | null
          business_hours_display?: string | null
          created_at?: string
          footer_cta_body?: string | null
          footer_cta_title?: string | null
          hero_hours_badge_short?: string | null
          hero_late_night_note?: string | null
          hero_starting_price_label?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          is_roushou_visible?: boolean
          roushou_intro?: string | null
          roushou_section_body?: string | null
          roushou_section_title?: string | null
          services?: Json
          stats?: Json
          store_id?: string
          studios_shell?: Json
          therapist_highlights?: Json
          therapist_section_body?: string | null
          therapist_section_title?: string | null
          therapist_tags_line?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          store_id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          store_id: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          store_id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
