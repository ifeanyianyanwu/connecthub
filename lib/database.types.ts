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
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          member_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          member_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          member_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string | null
          id: string
          status: string
          updated_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hobbies: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_new_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_new_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          community_id: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          community_alerts: boolean | null
          created_at: string | null
          display_name: string | null
          email: string | null
          email_notifications: boolean | null
          hobby_embedding: string | null
          id: string
          is_admin: boolean | null
          location: string | null
          profile_picture: string | null
          profile_visible: boolean | null
          push_notifications: boolean | null
          read_receipts_enabled: boolean | null
          show_online_status: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          community_alerts?: boolean | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          hobby_embedding?: string | null
          id: string
          is_admin?: boolean | null
          location?: string | null
          profile_picture?: string | null
          profile_visible?: boolean | null
          push_notifications?: boolean | null
          read_receipts_enabled?: boolean | null
          show_online_status?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          community_alerts?: boolean | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          hobby_embedding?: string | null
          id?: string
          is_admin?: boolean | null
          location?: string | null
          profile_picture?: string | null
          profile_visible?: boolean | null
          push_notifications?: boolean | null
          read_receipts_enabled?: boolean | null
          show_online_status?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_content_id?: string
          reported_content_type?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hobbies: {
        Row: {
          created_at: string | null
          hobby_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hobby_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hobby_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hobbies_hobby_id_fkey"
            columns: ["hobby_id"]
            isOneToOne: false
            referencedRelation: "hobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_hobbies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_conversation_partner: {
        Args: { other_user_id: string; user_id: string }
        Returns: {
          last_message: string
          last_message_at: string
          partner_id: string
          unread_count: number
        }[]
      }
      get_user_conversations: {
        Args: { user_id: string }
        Returns: {
          last_message: string
          last_message_at: string
          last_message_is_mine: boolean
          partner_display_name: string
          partner_id: string
          partner_profile_picture: string
          partner_username: string
          unread_count: number
        }[]
      }
      get_weighted_recommendations: {
        Args: { query_user_id: string }
        Returns: {
          ai_match_score: number
          bio: string
          display_name: string
          exact_match_score: number
          hobbies: string[]
          id: string
          location: string
          mutual_count: number
          profile_picture: string
          shared_interests: string[]
          total_score: number
          username: string
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
