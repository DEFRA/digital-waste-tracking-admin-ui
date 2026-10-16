import Joi from 'joi'

// Stricter than Client Sync, which also allows digits, dots and hyphens
export const createClientCredentialsSchema = Joi.object({
  clientName: Joi.string()
    .trim()
    .required()
    .pattern(/^[A-Za-z_]+$/)
    .max(128)
    .messages({
      'string.empty': 'Enter a client name',
      'any.required': 'Enter a client name',
      'string.pattern.base':
        'Client name must only include letters and underscores',
      'string.max': 'Client name must be 128 characters or fewer'
    })
})
