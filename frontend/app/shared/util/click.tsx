import { useEffect } from "react";

export function useOutsideClick(
  ref: React.RefObject<HTMLDivElement | null>,
  callback: () => void,
  exceptionRef?: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !(exceptionRef?.current && exceptionRef.current.contains(target))
      ) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, callback, exceptionRef]);
}
