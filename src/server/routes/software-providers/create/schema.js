import Joi from 'joi'

// The same characters Client Sync allows
export const createClientCredentialsSchema = Joi.object({
  clientName: Joi.string()
    .trim()
    .required()
    .pattern(/^[\w.-]+$/)
    .max(128)
    .messages({
      'string.empty': 'Enter a client name',
      'any.required': 'Enter a client name',
      'string.pattern.base':
        'Client name must only include letters, numbers, hyphens, underscores and full stops',
      'string.max': 'Client name must be 128 characters or fewer'
    })
})
