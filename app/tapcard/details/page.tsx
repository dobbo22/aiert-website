import { redirect } from "next/navigation";

// https://tapcard.aiert.co.uk/details#… is PowerSearch handing details back to the TapCard app (a Universal Link, so iPhone opens the
// app without asking). Anyone who lands here without the app has nothing to do on this page.
export default function DetailsHandBack() {
  redirect("/");
}
