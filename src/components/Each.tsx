import React from "react";

/**
 * This is a custom iteration component.
 * It takes an array of items and a render function as props.
 * It renders each item using the provided render function.
 */

interface IEachProps<T = unknown> {
  of: T[];
  render: (item: T, index: number) => React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 
 * @param of - Array of items to iterate over
 * @param render - Render function for each item
 * @param fallback - Fallback content if the array is empty
 * @returns Rendered list of items or fallback content
 */
export function Each<T>({
  of,
  render,
  fallback = "No items to display."
}: Readonly<IEachProps<T>>) {
  if (!of.length) return <>{fallback}</>;

  return (
    <>
      {of.map((item, index) => (
        <React.Fragment key={index}>
          {render(item, index)}
        </React.Fragment>
      ))}
    </>
  )
}