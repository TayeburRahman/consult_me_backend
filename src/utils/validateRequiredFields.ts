const validateRequiredFields = (fields: Record<string, any>) => {
  for (const [key, value] of Object.entries(fields)) {
    if (!value) {
      return `The ${key} field is required.`;
    }
  }
  return null;
};

export default validateRequiredFields;
