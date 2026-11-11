import { redirect } from "next/navigation";

// https://www.aiert.co.uk/powersearch/<sender|details>#… is TapCard opening the PowerSearch app (a Universal Link, so iPhone opens the
// app without asking). Anyone who lands here without the app is sent to the PowerSearch page.
export default function PowerSearchHandOver() {
  redirect("/powersearch");
}
