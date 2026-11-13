"use client";

import { Heart } from "lucide-react";
import { isPublic } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { EmptyState } from "@/components/ui";
import { Loading } from "@/components/guards";
import { ServiceCard } from "@/components/cards";

export default function Favourites() {
  const { db, user } = useSession();
  if (!db.ready) return <Loading />;
  const saved = db.favs.filter((f) => f.userId === user?.id)
    .map((f) => db.services.find((s) => s.id === f.serviceId)).filter((s) => !!s && isPublic(s));
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Favourites</h1>
      {saved.length === 0 ? (
        <EmptyState icon={Heart} title="No favourites yet" body="Tap the heart on a service to save it here." action={{ href: "/explore", label: "Explore services" }} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((s) => <li key={s!.id}><ServiceCard s={s!} seller={db.users.find((u) => u.id === s!.sellerId)} /></li>)}
        </ul>
      )}
    </>
  );
}
