'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Clock() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    setDate(new Date());
    const timerId = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  if (!date) {
    return null;
  }

  return (
    <div className="text-left">
      <p className="font-semibold text-lg text-sidebar-foreground">
        {format(date, 'hh:mm:ss a')}
      </p>
      <p className="text-sm text-sidebar-foreground/80">
        {format(date, 'EEEE, MMMM d, yyyy')}
      </p>
    </div>
  );
}
