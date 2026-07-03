import React from "react"
import { cx } from "@/lib/utils"

type As = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"

type KineticTextProps = React.HTMLAttributes<HTMLElement> & {
  text: string
  as?: As
  highlightFirst?: boolean // 1. Add our new brand switch
}

export function KineticText({
  text,
  as: Tag = "h1",
  className = "",
  highlightFirst = false, // 2. Set it to false by default
  style,
  ...rest
}: KineticTextProps) {
  const mergedStyle = {
    "--hover-padding": "calc(1em / 12)",
    "--text-stroke-width": "calc(1em * 125 / 6000)",
    ...(style as React.CSSProperties | undefined),
  } as React.CSSProperties

  return (
    <Tag
      {...rest}
      className={cx("flex flex-wrap font-[300]", className)}
      style={mergedStyle}
    >
      {text.split("").map((letter, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cx(
            "[will-change:font-weight,-webkit-text-stroke-width,padding] [-webkit-text-stroke-color:transparent] [-webkit-text-stroke-width:var(--text-stroke-width)] [transition:font-weight_0.4s,_-webkit-text-stroke-color_0.4s,_padding_0.4s] hover:[padding-inline:var(--hover-padding)] hover:font-[900] hover:[-webkit-text-stroke-color:currentcolor] hover:[-webkit-text-stroke-width:calc(var(--text-stroke-width)*2)] has-[+span+span:hover]:font-[400] has-[+span:hover]:[padding-inline:var(--hover-padding)] has-[+span:hover]:font-[600] [:hover+&]:[padding-inline:var(--hover-padding)] [:hover+&]:font-[600] [:hover+span+&]:font-[400]",
            // 3. If the switch is ON and it's the 1st letter (index 0), color it Amber!
            highlightFirst && (i === 5 || i === 4|| i === 3) ? "text-amber-500" : ""
          )}
        >
          {letter === " " ? "\u00A0" : letter}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}