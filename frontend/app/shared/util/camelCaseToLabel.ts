export function camelCaseToLabel(camel: string): string {
  return (
    camel
      // insert space before upper case letters
      .replace(/([A-Z])/g, " $1")
      // then make sure first word starts with upper case
      .replace(/^./, (match) => match.toUpperCase())
      .trim()
  );
}

// Helper to convert snake_case from backend to camelCase for frontend UI
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const convertKeysToCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);

  const newObj: any = {};
  for (const key in obj) {
    const camelKey = toCamelCase(key);
    newObj[camelKey] = convertKeysToCamelCase(obj[key]);
  }
  return newObj;
};
