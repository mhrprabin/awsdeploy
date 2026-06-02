module.exports = {
  HTTP: {
    OK:         200,
    CREATED:    201,
    BAD_REQUEST:400,
    UNAUTHORIZED:401,
    FORBIDDEN:  403,
    NOT_FOUND:  404,
    CONFLICT:   409,
    SERVER_ERROR:500,
  },
  DB_ERRORS: {
    DUPLICATE_ENTRY: 'ER_DUP_ENTRY',
  },
  JWT: {
    CLOCK_SKEW_BUFFER: 5, // seconds subtracted from cache TTL to handle clock drift
  },
  USER_ROLES: {
    USER:  'user',
    ADMIN: 'admin',
  },
}
