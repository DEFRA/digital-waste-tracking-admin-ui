const joiConfig = {
  abortEarly: false
}

/**
 * Validates data using a JOi schema and returns errors in a format compatible with
 * the govukErrorSummary component.
 * @param {object} data - The request data
 * @param {import('joi').Schema} schema - The Joi schema
 * @returns {[{message: string, fieldId: string}]} The error messages
 */
export function validateData(data, schema) {
  const errors = schema.validate(data, joiConfig)

  return errors?.error?.details.reduce((errors, { message, path, context }) => {
    const fieldName = path[0] || context?.local?.fieldName // Handle standard and custom field names
    errors[fieldName] = message
    return errors
  }, {})
}
