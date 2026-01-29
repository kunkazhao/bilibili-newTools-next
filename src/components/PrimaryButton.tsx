import React from "react"
import { Button } from "@/components/ui/button"

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export default function PrimaryButton(props: PrimaryButtonProps) {
  return <Button {...props} />
}
