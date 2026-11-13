"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavourite } from "@/lib/demo/actions";
import { useSession } from "@/lib/demo/store";
import { useResult } from "./toast";

export function FavButton({ serviceId }: { serviceId: string }) {
  const { db, user } = useSession();
  const router = useRouter();
  const toast = useResult();
  const on = !!user && db.favs.some((f) => f.userId === user.id && f.serviceId === serviceId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from favourites" : "Save to favourites"}
      className="glossy-pill absolute right-8 top-8 grid h-9 w-9 place-items-center"
      onClick={() => {
        if (!user) return router.push("/login");
        toast(toggleFavourite(serviceId));
      }}
    >
      <Heart size={16} className={on ? "fill-danger text-danger" : "text-muted"} aria-hidden />
    </button>
  );
}
