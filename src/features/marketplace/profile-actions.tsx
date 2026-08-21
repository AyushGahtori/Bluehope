"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Heart, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { BlueSelect, Button, Card, Input } from "@/components/ui/primitives";

type ActionMode = "contact" | "enquiry" | "booking" | null;

export function ProfileActions({ providerName }: { providerName: string }) {
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<ActionMode>(null);

  return (
    <Card className="space-y-3 p-5">
      <Button className="w-full" onClick={() => setMode("contact")}>
        <MessageSquare className="h-4 w-4" />
        Contact Now
      </Button>
      <Button variant="outline" className="w-full" onClick={() => setMode("enquiry")}>
        Send Enquiry
      </Button>
      <Button variant={saved ? "secondary" : "outline"} className="w-full" onClick={() => setSaved((value) => !value)}>
        <Heart className={saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />
        {saved ? "Saved" : "Save Provider"}
      </Button>
      <Button variant="outline" className="w-full" onClick={() => setMode("booking")}>
        <CalendarCheck className="h-4 w-4" />
        Book Appointment
      </Button>

      <AnimatePresence>
        {mode ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-slate-950">
                  {mode === "booking" ? "Book an appointment" : mode === "enquiry" ? "Send an enquiry" : "Contact request"}
                </p>
                <button onClick={() => setMode(null)} aria-label="Close form">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <Input placeholder="Your name" defaultValue="Neha Sharma" />
                <Input placeholder="Phone number" />
                {mode === "booking" ? (
                  <>
                    <Input type="date" />
                    <BlueSelect
                      placeholder="Select time slot"
                      options={[
                        { value: "10", label: "10:00 AM - 11:00 AM" },
                        { value: "14", label: "02:00 PM - 03:00 PM" },
                        { value: "17", label: "05:00 PM - 06:00 PM" },
                      ]}
                    />
                  </>
                ) : null}
                <textarea
                  className="min-h-24 w-full rounded-[12px] border border-slate-300 bg-white p-4 text-sm outline-none focus:border-bluehope focus:ring-4 focus:ring-blue-100"
                  placeholder={`Message for ${providerName}`}
                />
                <Button className="w-full" onClick={() => setMode(null)}>
                  {mode === "booking" ? "Request booking" : "Send request"}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
