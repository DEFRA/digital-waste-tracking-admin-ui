const joiConfig = {
  abortEarly: false
}

/**
 * Validates data using a JOi schema and returns errors in a format compatible with
 * the govukErrorSummary component.
 *
 * @param {Object} data - The request data
 * @param {Joi.schema} schema - The Joi schema
 *
 * @returns {[{ message: String, fieldId: String }]} The error messages
 */
export function validateData(data, schema) {
  const errors = schema.validate(data, joiConfig)

  return errors?.error?.details.reduce((errors, { message, path, context }) => {
    const fieldName = path[0] || context?.local?.fieldName // Handle standard and custom field names
    errors[fieldName] = message
    return errors
  }, {})
}
