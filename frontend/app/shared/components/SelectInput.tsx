import { useRef, useState } from "react";
import { useOutsideClick } from "../util/click";

export interface Option<T> {
  label: string;
  value: T;
}

export default function SelectInput<T>({
  name,
  selectedOptionValue,
  onSelectedOptionValueChange,
  options,
  disabled = false,
  required = false,
  width = "min-w-48",
}: {
  name: string;
  selectedOptionValue?: T;
  onSelectedOptionValueChange?: (value: T) => void;
  options: Option<T>[];
  disabled?: boolean;
  className?: string;
  required?: boolean;
  width?: string;
}) {
  const [isListShown, setListShown] = useState(false);
  const divRef = useRef<HTMLDivElement | null>(null);
  const exceptionRef = useRef<HTMLDivElement | null>(null);
  useOutsideClick(divRef, () => setListShown(false), exceptionRef);
  const selectedOption = options.find(
    (option) => option.value === selectedOptionValue,
  );
  const labelText = selectedOption ? selectedOption.label : "Select…";
  const baseClass =
    "w-full cursor-pointer flex justify-between items-center border border-gray-300 p-[11px] text-sm focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className={`relative ${width}`}>
      <input
        type="text"
        name={name}
        value={
          selectedOptionValue === undefined || selectedOptionValue === null
            ? ""
            : String(selectedOptionValue)
        }
        required={required}
        readOnly
        hidden
      />
      <div ref={exceptionRef}>
        <button
          type="button"
          onClick={disabled ? undefined : () => setListShown(!isListShown)}
          className={
            disabled ? `${baseClass} cursor-not-allowed opacity-50` : baseClass
          }
        >
          <span>{labelText}</span>
          <svg
            width="14"
            height="8"
            viewBox="0 0 14 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.75 0.750001L6.75 6.75L0.75 0.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isListShown && (
        <div ref={divRef}>
          <ul className="absolute z-10 mt-1 w-full  bg-white p-1 shadow-lg border border-gray-200">
            {options.map((option, index) => (
              <li
                key={index}
                className="cursor-pointer  p-2 hover:bg-primary/20 text-sm text-gray-700"
                onClick={() => {
                  setListShown(false);
                  onSelectedOptionValueChange?.(option.value);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
