export type StudentSession = {
  session_id: string;
  student_id: string;
  check_in_time: string;
  check_out_time: string | null;
  expires_at: string | null;
  duration_minutes: number | null;
  allotted_time: number | null;
  session_status: string;
  status: string;
  baggage_info: string | null;
  bag_number: string | null;
};