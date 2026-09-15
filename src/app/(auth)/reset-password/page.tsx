import { redirect } from "next/navigation";
export default function DeprecatedResetPage() { redirect("/access-link?state=required"); }
