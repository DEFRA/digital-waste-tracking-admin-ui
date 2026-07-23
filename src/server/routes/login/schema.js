import Joi from 'joi'

export const loginPayloadSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'string.empty': 'Enter a username',
    'any.required': 'Enter a username'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Enter a password',
    'any.required': 'Enter a password'
  }),
  redirectTo: Joi.string().optional().allow('')
})
