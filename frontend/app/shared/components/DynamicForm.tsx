import Input from "./Input";
import { Dispatch, JSX, SetStateAction } from "react";
import Button from "./Button";
import { camelCaseToLabel } from "../util/camelCaseToLabel";
import SelectInput from "./SelectInput";

interface Option<T> {
  label: string;
  value: T;
}

type FieldMetaBase = {
  singleRow?: boolean;
  type?:
    | "string"
    | "number"
    | "boolean"
    | "email"
    | "password"
    | "date"
    | "time"
    | "select"
    | "radio"
    | "text-area"
    | "color";
  options?: Option<any>[];
  instruction?: string;
  required?: boolean;
  disabled?: boolean;
};

type SelectFieldMeta<T> = {
  type: "select";
  options: Option<T>[];
  disabled?: boolean;
} & Pick<FieldMetaBase, "singleRow">;

type RadioFieldMeta = {
  type: "radio";
  options: Option<any>[];
  required?: boolean;
  disabled?: boolean;
} & Pick<FieldMetaBase, "singleRow" | "instruction">;

type TextMeta = {
  type: "text";
  content: string;
  singleRow?: boolean;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

type HeadingMeta = {
  type: "heading";
  content: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  singleRow?: boolean;
};

type ButtonProps = {
  text: string;
  variant: "primary" | "secondary" | "warning" | "none";
  props: React.ComponentProps<"button"> & {
    icon?: React.ReactNode;
  };
};

type ButtonMeta = {
  type: "button";
  buttons: ButtonProps[];
};

type NoticeMeta = {
  type: "notice";
  content: string;
  singleRow?: boolean;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  variant: "warning" | "error";
};

type NonSelectFieldMeta = {
  type?:
    | "string"
    | "number"
    | "boolean"
    | "email"
    | "password"
    | "date"
    | "time"
    | "text-area"
    | "color";
  singleRow?: boolean;
  instruction?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

type FieldMeta<T = string | number> =
  | SelectFieldMeta<T>
  | RadioFieldMeta
  | TextMeta
  | HeadingMeta
  | ButtonMeta
  | NoticeMeta
  | NonSelectFieldMeta;

export type FormSchema<T = string | number> = Record<string, FieldMeta<T>>;

export type DynamicFormProps<
  TValues extends Record<string, any>,
  T = string,
> = {
  state: TValues;
  schema?: FormSchema<T>;
  values: TValues;
  setValues: Dispatch<SetStateAction<TValues>>;
};

export const DynamicForm = <
  TValues extends Record<string, any>,
  T extends string | number = string,
>({
  state,
  schema = {},
  values,
  setValues,
}: DynamicFormProps<TValues, T>) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const { value, type, checked } = e.target;
    const meta = schema[key] ?? {};
    const fieldType = meta.type ?? typeof values[key];

    if (fieldType === "boolean") {
      setValues((prev: any) => ({
        ...prev,
        [key]: checked,
      }));
    } else {
      setValues((prev: any) => ({
        ...prev,
        [key]: type === "number" ? Number(value) : value,
      }));
    }
  };

  const handleRadioChange = (value: any, key: string) => {
    setValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTextAreaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string,
  ) => {
    setValues((prev: any) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  // Check if field should take full width
  const isFullWidth = (key: string) => {
    const meta = schema[key];
    if (!meta) return false;
    const fieldType = meta.type;

    return (
      fieldType === "button" ||
      meta.singleRow ||
      fieldType === "text" ||
      fieldType === "heading" ||
      fieldType === "radio"
    );
  };

  const renderField = (key: string) => {
    const meta = schema[key]!;
    const fieldType = meta.type;

    // Text elements - always full width
    if (fieldType === "text") {
      return (
        <div key={key} className="md:col-span-2">
          <p className="text-gray-600  dark:text-gray-300">
            {(meta as TextMeta).content}
          </p>
        </div>
      );
    }

    if (fieldType === "notice") {
      const { content, variant } = meta as NoticeMeta;
      return (
        <div key={key} className="rounded-lg md:col-span-2">
          <div
            className={`flex items-center border-l-4 rounded-lg gap-3 ${variant === "warning" ? "border-yellow-500  bg-yellow-500/10" : "border-red-500  bg-red-500/10"} p-4`}
          >
            {variant === "warning" ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="text-yellow-500"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.5099 5.85L13.5699 2.42C12.5999 1.86 11.3999 1.86 10.4199 2.42L4.48992 5.85C3.51992 6.41 2.91992 7.45 2.91992 8.58V15.42C2.91992 16.54 3.51992 17.58 4.48992 18.15L10.4299 21.58C11.3999 22.14 12.5999 22.14 13.5799 21.58L19.5199 18.15C20.4899 17.59 21.0899 16.55 21.0899 15.42V8.58C21.0799 7.45 20.4799 6.42 19.5099 5.85ZM11.2499 7.75C11.2499 7.34 11.5899 7 11.9999 7C12.4099 7 12.7499 7.34 12.7499 7.75V13C12.7499 13.41 12.4099 13.75 11.9999 13.75C11.5899 13.75 11.2499 13.41 11.2499 13V7.75ZM12.9199 16.63C12.8699 16.75 12.7999 16.86 12.7099 16.96C12.5199 17.15 12.2699 17.25 11.9999 17.25C11.8699 17.25 11.7399 17.22 11.6199 17.17C11.4899 17.12 11.3899 17.05 11.2899 16.96C11.1999 16.86 11.1299 16.75 11.0699 16.63C11.0199 16.51 10.9999 16.38 10.9999 16.25C10.9999 15.99 11.0999 15.73 11.2899 15.54C11.3899 15.45 11.4899 15.38 11.6199 15.33C11.9899 15.17 12.4299 15.26 12.7099 15.54C12.7999 15.64 12.8699 15.74 12.9199 15.87C12.9699 15.99 12.9999 16.12 12.9999 16.25C12.9999 16.38 12.9699 16.51 12.9199 16.63Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="text-red-500"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.76 15.92L15.36 4.4C14.5 2.85 13.31 2 12 2C10.69 2 9.49998 2.85 8.63998 4.4L2.23998 15.92C1.42998 17.39 1.33998 18.8 1.98998 19.91C2.63998 21.02 3.91998 21.63 5.59998 21.63H18.4C20.08 21.63 21.36 21.02 22.01 19.91C22.66 18.8 22.57 17.38 21.76 15.92ZM11.25 9C11.25 8.59 11.59 8.25 12 8.25C12.41 8.25 12.75 8.59 12.75 9V14C12.75 14.41 12.41 14.75 12 14.75C11.59 14.75 11.25 14.41 11.25 14V9ZM12.71 17.71C12.66 17.75 12.61 17.79 12.56 17.83C12.5 17.87 12.44 17.9 12.38 17.92C12.32 17.95 12.26 17.97 12.19 17.98C12.13 17.99 12.06 18 12 18C11.94 18 11.87 17.99 11.8 17.98C11.74 17.97 11.68 17.95 11.62 17.92C11.56 17.9 11.5 17.87 11.44 17.83C11.39 17.79 11.34 17.75 11.29 17.71C11.11 17.52 11 17.26 11 17C11 16.74 11.11 16.48 11.29 16.29C11.34 16.25 11.39 16.21 11.44 16.17C11.5 16.13 11.56 16.1 11.62 16.08C11.68 16.05 11.74 16.03 11.8 16.02C11.93 15.99 12.07 15.99 12.19 16.02C12.26 16.03 12.32 16.05 12.38 16.08C12.44 16.1 12.5 16.13 12.56 16.17C12.61 16.21 12.66 16.25 12.71 16.29C12.89 16.48 13 16.74 13 17C13 17.26 12.89 17.52 12.71 17.71Z"
                  fill="currentColor"
                />
              </svg>
            )}
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {content}
            </p>
          </div>
        </div>
      );
    }

    if (fieldType === "button") {
      const { buttons } = meta as ButtonMeta;
      return (
        <div key={key} className="flex gap-4">
          {buttons.map((btn, index) => (
            <Button
              key={index}
              text={btn.text}
              variant={btn.variant}
              {...btn.props}
            />
          ))}
        </div>
      );
    }

    // Heading elements - always full width
    if (fieldType === "heading") {
      const { content, level = 3 } = meta as HeadingMeta;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return (
        <div key={key} className="md:col-span-2">
          <Tag className="font-bold text-lg">{content}</Tag>
        </div>
      );
    }

    // Skip if not a form field and doesn't exist in state
    const isFormField = [
      "string",
      "number",
      "boolean",
      "email",
      "password",
      "date",
      "time",
      "select",
      "radio",
      "text-area",
      "color",
    ].includes(fieldType || "");
    if (!isFormField && !state[key]) return null;

    const isBoolean = fieldType === "boolean";
    const inputId = `field_${key}`;

    const fieldContent = (
      <div
        className={`${isBoolean ? "flex flex-row-reverse items-center justify-end gap-2" : ""}`}
      >
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-600 dark:text-gray-300 my-1"
        >
          {camelCaseToLabel(key)}
        </label>

        {fieldType === "radio" ? (
          <div
            className={`flex gap-2 mt-1 w-full" ${isFullWidth(key) ? "flex-wrap" : "flex-col"}`}
          >
            {(meta as RadioFieldMeta).options!.map((option) => (
              <label
                key={option.value as string}
                className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
              >
                <Input
                  id={`${inputId}_${option.value}`}
                  type="radio"
                  name={key}
                  value={option.value}
                  checked={values[key] === option.value}
                  onChange={(e) => handleRadioChange(option.value, key)}
                  className="!h-4 !w-4 accent-secondary"
                  required={meta.required}
                  disabled={meta.disabled}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        ) : fieldType === "text-area" ? (
          <textarea
            id={inputId}
            className={`${meta.disabled && "cursor-not-allowed opacity-50"} block w-full p-2.5 peer text-sm border border-gray-300 focus:ring-primary focus:outline-hidden focus:border-primary`}
            value={values[key] ?? ""}
            placeholder={meta.placeholder}
            onChange={(e) => handleTextAreaChange(e, key)}
            disabled={meta.disabled}
          />
        ) : fieldType === "select" ? (
          <SelectInput
            name={key}
            selectedOptionValue={values[key]}
            onSelectedOptionValueChange={(value) => {
              setValues((prev: any) => ({ ...prev, [key]: value }));
            }}
            options={meta.options!}
            disabled={meta.disabled}
          />
        ) : fieldType === "color" ? (
          <Input
            id={inputId}
            type="color"
            name={key}
            value={values[key] ?? ""}
            onChange={(e) => handleChange(e, key)}
            placeholder={meta.placeholder}
            required={meta.required}
            className="py-0 px-1 max-w-10 h-8 cursor-pointer"
            disabled={meta.disabled}
          />
        ) : isBoolean ? (
          <Input
            id={inputId}
            type="checkbox"
            className="!h-4 !w-4 accent-secondary cursor-pointer"
            checked={values[key] as boolean}
            onChange={(e) => handleChange(e, key)}
            required={meta.required}
            disabled={meta.disabled}
          />
        ) : (
          <div key={key} className="space-y-1">
            <Input
              id={inputId}
              type={
                fieldType === "number"
                  ? "number"
                  : fieldType === "email"
                    ? "email"
                    : fieldType === "password"
                      ? "password"
                      : fieldType === "date"
                        ? "date"
                        : fieldType === "time"
                          ? "time"
                          : "text"
              }
              value={values[key] ?? ""}
              onChange={(e) => handleChange(e, key)}
              className="w-full"
              placeholder={meta.placeholder}
              required={meta.required}
              disabled={meta.disabled}
            />
            {meta.instruction && fieldType === "password" && (
              <p className="text-xs text-gray-600 mt-1">{meta.instruction}</p>
            )}
          </div>
        )}
      </div>
    );

    if (isFullWidth(key)) {
      return (
        <div key={key} className="md:col-span-2">
          {fieldContent}
        </div>
      );
    }

    return (
      <div key={key} className="flex-1">
        {fieldContent}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.keys(schema).map((key) => renderField(key))}
    </div>
  );
};
