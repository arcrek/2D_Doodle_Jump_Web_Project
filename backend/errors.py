class APIError(Exception):
    """Ngoại lệ nghiệp vụ của API, tự động serialize thành JSON chuẩn quy ước."""

    def __init__(self, code, message, details=None, status_code=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code
