import { useEffect, useState } from "react";

export function usePermissions(role: string | undefined) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) return;

    fetch(`/api/permissions?role=${role}`)
      .then(r => r.json())
      .then(data => {
        setPermissions(data);
        setLoading(false);
      });
  }, [role]);

  return { permissions, loading };
}
