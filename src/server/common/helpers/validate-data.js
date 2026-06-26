export function validateData(data, schema) {
  const errors = schema.validate(data, {
    abortEarly: false
  })

  return errors?.error?.details.map(({ message, path, context }) => ({
    message,
    fieldId: path[0] || context?.local?.fieldName
  }))
}
