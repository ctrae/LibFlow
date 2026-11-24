class AuthenticationError(Exception):
    pass


class AuthorizationError(Exception):
    pass


class SessionNotFoundError(Exception):
    pass


class SupabaseServiceError(Exception):
    pass
