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
      agents: {
        Row: {
          agency: string
          agency_slug: string
          bio: string
          calendar_url: string
          created_at: string
          email: string
          first_name: string
          headshot_url: string
          id: string
          last_name: string
          name: string
          npn: string
          phone: string
          short_bio: string
          slug: string
          state_licenses: Json
          testimonials: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency?: string
          agency_slug?: string
          bio?: string
          calendar_url?: string
          created_at?: string
          email?: string
          first_name: string
          headshot_url?: string
          id?: string
          last_name: string
          name: string
          npn?: string
          phone?: string
          short_bio?: string
          slug: string
          state_licenses?: Json
          testimonials?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency?: string
          agency_slug?: string
          bio?: string
          calendar_url?: string
          created_at?: string
          email?: string
          first_name?: string
          headshot_url?: string
          id?: string
          last_name?: string
          name?: string
          npn?: string
          phone?: string
          short_bio?: string
          slug?: string
          state_licenses?: Json
          testimonials?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      intake_requests: {
        Row: {
          agent_id: string
          created_at: string
          email: string
          first_name: string
          form_source: string
          id: string
          idempotency_key: string
          last_name: string
          page_path: string
          payload_hash: string
          phone_display: string
          phone_e164: string
          state: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          email: string
          first_name: string
          form_source: string
          id?: string
          idempotency_key: string
          last_name: string
          page_path: string
          payload_hash: string
          phone_display: string
          phone_e164: string
          state?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          email?: string
          first_name?: string
          form_source?: string
          id?: string
          idempotency_key?: string
          last_name?: string
          page_path?: string
          payload_hash?: string
          phone_display?: string
          phone_e164?: string
          state?: string | null
        }
        Relationships: []
      }
      sms_consent_events: {
        Row: {
          agent_id: string
          choice: string
          created_at: string
          disclosure_version_id: string
          displayed_text: string
          id: string
          intake_request_id: string
          phone_e164: string
          privacy_effective_on: string
          privacy_url: string
          purpose: string
          sender_agency: string
          sender_name: string
          suppressed_at_capture: boolean
          terms_effective_on: string
          terms_url: string
        }
        Insert: {
          agent_id: string
          choice: string
          created_at?: string
          disclosure_version_id: string
          displayed_text: string
          id?: string
          intake_request_id: string
          phone_e164: string
          privacy_effective_on: string
          privacy_url: string
          purpose: string
          sender_agency: string
          sender_name: string
          suppressed_at_capture?: boolean
          terms_effective_on: string
          terms_url: string
        }
        Update: {
          agent_id?: string
          choice?: string
          created_at?: string
          disclosure_version_id?: string
          displayed_text?: string
          id?: string
          intake_request_id?: string
          phone_e164?: string
          privacy_effective_on?: string
          privacy_url?: string
          purpose?: string
          sender_agency?: string
          sender_name?: string
          suppressed_at_capture?: boolean
          terms_effective_on?: string
          terms_url?: string
        }
        Relationships: []
      }
      sms_suppressions: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          phone_e164: string
          reason: string
          source: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          phone_e164: string
          reason: string
          source: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          phone_e164?: string
          reason?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      submit_public_intake: {
        Args: {
          p_idempotency_key: string
          p_form_source: string
          p_page_path: string
          p_agency_slug: string
          p_agent_slug: string
          p_first_name: string
          p_last_name: string
          p_email: string
          p_phone: string
          p_state: string
          p_informational_consent: boolean
          p_marketing_consent: boolean
          p_disclosure_version_id: string
          p_fax_number: string
        }
        Returns: Json
      }
      my_sms_eligibility: {
        Args: {
          p_phone: string
          p_message_class: string
        }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
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
