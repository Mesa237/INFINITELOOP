export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_user_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_user_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_user_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_user_id_fkey";
            columns: ["blocked_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      help_requests: {
        Row: {
          created_at: string;
          description: string;
          help_type: string;
          id: string;
          neighborhood: string;
          preferred_language: string | null;
          requested_for: string | null;
          requester_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          help_type: string;
          id?: string;
          neighborhood: string;
          preferred_language?: string | null;
          requested_for?: string | null;
          requester_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          help_type?: string;
          id?: string;
          neighborhood?: string;
          preferred_language?: string | null;
          requested_for?: string | null;
          requester_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "help_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          help_request_id: string;
          id: string;
          status: string;
          updated_at: string;
          volunteer_id: string;
        };
        Insert: {
          created_at?: string;
          help_request_id: string;
          id?: string;
          status?: string;
          updated_at?: string;
          volunteer_id: string;
        };
        Update: {
          created_at?: string;
          help_request_id?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          volunteer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_help_request_id_fkey";
            columns: ["help_request_id"];
            isOneToOne: false;
            referencedRelation: "help_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_volunteer_id_fkey";
            columns: ["volunteer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_preferences: {
        Row: {
          origin_country_code: string | null;
          updated_at: string;
          use_origin_for_matching: boolean;
          user_id: string;
        };
        Insert: {
          origin_country_code?: string | null;
          updated_at?: string;
          use_origin_for_matching?: boolean;
          user_id: string;
        };
        Update: {
          origin_country_code?: string | null;
          updated_at?: string;
          use_origin_for_matching?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          id: string;
          languages: string[];
          neighborhood: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          languages?: string[];
          neighborhood?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          languages?: string[];
          neighborhood?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          category: string;
          created_at: string;
          details: string | null;
          help_request_id: string | null;
          id: string;
          reported_user_id: string | null;
          reporter_id: string;
          status: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          details?: string | null;
          help_request_id?: string | null;
          id?: string;
          reported_user_id?: string | null;
          reporter_id: string;
          status?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          details?: string | null;
          help_request_id?: string | null;
          id?: string;
          reported_user_id?: string | null;
          reporter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          created_at: string;
          help_request_id: string;
          id: string;
          rating: number;
          reason: string | null;
          reviewee_id: string;
          reviewer_id: string;
        };
        Insert: {
          created_at?: string;
          help_request_id: string;
          id?: string;
          rating: number;
          reason?: string | null;
          reviewee_id: string;
          reviewer_id: string;
        };
        Update: {
          created_at?: string;
          help_request_id?: string;
          id?: string;
          rating?: number;
          reason?: string | null;
          reviewee_id?: string;
          reviewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_help_request_id_fkey";
            columns: ["help_request_id"];
            isOneToOne: false;
            referencedRelation: "help_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      }
      members: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          languages: string[]
          neighborhood: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string
          email: string
          id: string
          languages?: string[]
          neighborhood?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          languages?: string[]
          neighborhood?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          languages: string[]
          neighborhood: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string
          email: string
          id: string
          languages?: string[]
          neighborhood?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          languages?: string[]
          neighborhood?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_view_help_request: {
        Args: { target_request_id: string };
        Returns: boolean;
      };
      get_profile_rating: {
        Args: { target_profile_id: string };
        Returns: {
          average_rating: number;
          review_count: number;
        }[];
      };
      is_blocked_with: { Args: { target_user_id: string }; Returns: boolean };
      is_match_participant: {
        Args: { target_match_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
