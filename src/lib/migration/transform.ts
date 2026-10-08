export class TransformationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransformationError";
  }
}

export function identity(values: unknown[]): unknown {
  if (values.length === 0) {
    return undefined;
  }
  return values[0];
}

export function concat_with_space(values: unknown[]): string | null {
  const filtered = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (filtered.length === 0) {
    return null;
  }
  return filtered.map((v) => String(v).trim()).join(" ");
}

export function extract_year(values: unknown[]): number | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  const val = values[0];
  if (typeof val === "number") {
    if (Number.isInteger(val) && val >= 1000 && val <= 9999) {
      return val;
    }
    throw new TransformationError(`Invalid year number: ${val}`);
  }
  if (typeof val === "string") {
    const str = val.trim();
    if (!str) {
      return null;
    }
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new TransformationError(`Invalid date format for extract_year: "${str}"`);
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new TransformationError(`Invalid calendar date for extract_year: "${str}"`);
    }
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    if (
      dateObj.getUTCFullYear() !== year ||
      dateObj.getUTCMonth() !== month - 1 ||
      dateObj.getUTCDate() !== day
    ) {
      throw new TransformationError(`Invalid calendar date for extract_year: "${str}"`);
    }
    return year;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      throw new TransformationError("Invalid Date object for extract_year");
    }
    return val.getUTCFullYear();
  }
  throw new TransformationError(`Unsupported value type for extract_year: ${typeof val}`);
}

export function trim(values: unknown[]): string | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  const val = values[0];
  if (typeof val === "string") {
    return val.trim();
  }
  return String(val).trim();
}

export function lowercase(values: unknown[]): string | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  const val = values[0];
  if (typeof val === "string") {
    return val.toLowerCase();
  }
  return String(val).toLowerCase();
}

export function uppercase(values: unknown[]): string | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  const val = values[0];
  if (typeof val === "string") {
    return val.toUpperCase();
  }
  return String(val).toUpperCase();
}

export function to_string(values: unknown[]): string | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  return String(values[0]);
}

export function to_number(values: unknown[]): number | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  const val = values[0];
  if (typeof val === "number") {
    if (isNaN(val)) {
      throw new TransformationError("Invalid NaN number");
    }
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) {
      throw new TransformationError("Cannot convert empty string to number");
    }
    const num = Number(trimmed);
    if (isNaN(num)) {
      throw new TransformationError(`Cannot convert string "${val}" to number`);
    }
    return num;
  }
  throw new TransformationError(`Cannot convert type ${typeof val} to number`);
}

export function format_date(values: unknown[]): string | null {
  if (values.length === 0 || values[0] === null || values[0] === undefined) {
    return null;
  }
  const val = values[0];
  if (typeof val === "string") {
    const str = val.trim();
    if (!str) {
      return null;
    }
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new TransformationError(`Invalid date format for format_date: "${str}"`);
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new TransformationError(`Invalid calendar date for format_date: "${str}"`);
    }
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    if (
      dateObj.getUTCFullYear() !== year ||
      dateObj.getUTCMonth() !== month - 1 ||
      dateObj.getUTCDate() !== day
    ) {
      throw new TransformationError(`Invalid calendar date for format_date: "${str}"`);
    }
    const yStr = String(year).padStart(4, "0");
    const mStr = String(month).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      throw new TransformationError("Invalid Date object for format_date");
    }
    const year = val.getUTCFullYear();
    const month = val.getUTCMonth() + 1;
    const day = val.getUTCDate();
    const yStr = String(year).padStart(4, "0");
    const mStr = String(month).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  }
  throw new TransformationError(`Cannot format date from type ${typeof val}`);
}

export function executeTransformation(
  transformation: string,
  values: unknown[]
): unknown {
  switch (transformation) {
    case "identity":
      return identity(values);
    case "concat_with_space":
      return concat_with_space(values);
    case "extract_year":
      return extract_year(values);
    case "trim":
      return trim(values);
    case "lowercase":
      return lowercase(values);
    case "uppercase":
      return uppercase(values);
    case "to_string":
      return to_string(values);
    case "to_number":
      return to_number(values);
    case "format_date":
      return format_date(values);
    default:
      throw new TransformationError(`Unsupported transformation: "${transformation}"`);
  }
}
