from datetime import date
from typing import Any

from supabase import Client


class LibraryRepository:
    """All direct Supabase/PostgreSQL access for LIBFLOW."""

    def __init__(self, client: Client):
        self.client = client

    def find_active_session(self, student_id: str):
        return (
            self.client.table("library_sessions")
            .select("*")
            .eq("student_id", student_id)
            .eq("status", "active")
            .maybe_single()
            .execute()
            .data
        )

    def create_session(self, payload: dict[str, Any]):
        return (
            self.client.table("library_sessions")
            .insert(payload)
            .select("*")
            .single()
            .execute()
            .data
        )

    def get_session(self, session_id: str):
        return (
            self.client.table("library_sessions")
            .select("*")
            .eq("id", session_id)
            .maybe_single()
            .execute()
            .data
        )

    def list_sessions(self, status: str | None = None):
        query = self.client.table("library_sessions").select("*")
        if status:
            query = query.eq("status", status)
        return (
            query.order("check_in", desc=True).execute().data or []
        )

    def update_session(self, session_id: str, payload: dict[str, Any]):
        return (
            self.client.table("library_sessions")
            .update(payload)
            .eq("id", session_id)
            .select("*")
            .maybe_single()
            .execute()
            .data
        )

    def count_active_sessions(self) -> int:
        response = (
            self.client.table("library_sessions")
            .select("id", count="exact", head=True)
            .eq("status", "active")
            .execute()
        )
        return int(response.count or 0)

    def list_active_bags(self):
        return (
            self.client.table("library_sessions")
            .select("id,student_id,bag_number,status,check_in")
            .eq("status", "active")
            .not_.is_("bag_number", "null")
            .order("check_in", desc=True)
            .execute()
            .data or []
        )

    def list_events(self, session_id: str | None = None):
        query = self.client.table("library_session_events").select("*")
        if session_id:
            query = query.eq("session_id", session_id)
        return (
            query.order("created_at", desc=True).execute().data or []
        )

    def list_staff(self):
        return (
            self.client.table("staff")
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data or []
        )

    def add_staff(self, user_id: str, role: str):
        return (
            self.client.table("staff")
            .insert({"user_id": user_id, "role": role})
            .select("*")
            .single()
            .execute()
            .data
        )

    def remove_staff(self, user_id: str):
        return (
            self.client.table("staff")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )

    def rpc(self, function_name: str, params: dict[str, Any] | None = None):
        return self.client.rpc(function_name, params or {}).execute()

    def get_student_active_or_recent(self, student_id: str, limit: int = 20):
        return (
            self.client.table("library_sessions")
            .select("*")
            .eq("student_id", student_id)
            .order("check_in", desc=True)
            .limit(limit)
            .execute()
            .data or []
        )
