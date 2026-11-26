import { createPortal } from "react-dom";
import { DynamicForm, DynamicFormProps, FormSchema } from "./DynamicForm";
import { Dispatch, SetStateAction } from "react";
import Button from "./Button";

type BasePopUpProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onSubmit?: (values: React.SubmitEvent) => void;
  onCancel?: () => void;
  isValid?: boolean;
  className?: string;
  title?: string;
  description?: string;
  overlayClassName?: string;
  submitText?: string;
};

type StaticPopUpProps = {
  dynamicForm: false;
  popUpContent?: React.ReactNode;
  schema?: never;
  values?: never;
  setValues?: never;
  state?: never;
};

type DynamicPopUpProps<TValues extends Record<string, any>, T = string> = {
  dynamicForm: true;
  schema: FormSchema;
  popUpContent?: never;
} & DynamicFormProps<TValues, T>;

type PopUpProps<
  TValues extends Record<string, any> = any,
  T = string,
> = BasePopUpProps & (StaticPopUpProps | DynamicPopUpProps<TValues, T>);

export default function Popup<
  TValues extends Record<string, any> = any,
  T = string,
>(props: PopUpProps<TValues, T>) {
  const {
    isOpen,
    setIsOpen,
    title,
    description,
    dynamicForm,
    popUpContent,
    schema,
    state,
    values,
    isValid = true,
    setValues,
    onSubmit,
    onCancel,
    className,
    overlayClassName,
    submitText = "Confirm",
  } = props;

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 ${overlayClassName ?? ""}`}
      onClick={() => setIsOpen(false)}
    >
      <form
        className={`mx-auto w-full max-w-lg bg-background-white px-8 py-6 shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto ${
          className ?? ""
        }`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        {description && <p className="text-gray-600">{description}</p>}
        {dynamicForm && (
          <DynamicForm
            state={state}
            schema={schema}
            setValues={setValues!}
            values={values}
          />
        )}
        {popUpContent}
        <div className="mt-8 flex gap-2">
          <Button
            text="Cancel"
            type="button"
            variant="warning"
            onClick={() => {
              if (onCancel) onCancel();
              setIsOpen(false);
            }}
            className="w-full"
          />
          <Button
            disabled={!isValid}
            text={submitText}
            className="w-full"
            variant="secondary"
            type="submit"
          />
        </div>
      </form>
    </div>,
    document.body,
  );
}
