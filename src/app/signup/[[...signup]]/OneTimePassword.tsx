"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useSignUp } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const FormSchema = z.object({
  pin: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
});

export default function OneTimePassword({
  searchParams,
}: {
  searchParams: {
    // all for create video
    agent1Id?: string;
    agent2Id?: string;
    agent1Name?: string;
    agent2Name?: string;
    title?: string;
    credits?: string;
    music?: string;
    background?: string;
    assetType?: string;
    duration?: string;
    fps?: string;
  };
}) {
  const { signUp } = useSignUp();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pin: "",
    },
  });

  const pin = useWatch({
    control: form.control,
    name: "pin",
  });

  useEffect(() => {
    if (pin.length === 6) {
      form.handleSubmit(onSubmit)();
    }
  }, [pin]);

  const searchQueryString = `?agent1Id=${encodeURIComponent(
    searchParams.agent1Id || "",
  )}&agent2Id=${encodeURIComponent(
    searchParams.agent2Id || "",
  )}&agent1Name=${encodeURIComponent(
    searchParams.agent1Name || "",
  )}&agent2Name=${encodeURIComponent(
    searchParams.agent2Name || "",
  )}&title=${encodeURIComponent(
    searchParams.title || "",
  )}&credits=${encodeURIComponent(
    searchParams.credits || "",
  )}&music=${encodeURIComponent(
    searchParams.music || "",
  )}&background=${encodeURIComponent(
    searchParams.background || "",
  )}&assetType=${encodeURIComponent(
    searchParams.assetType || "",
  )}&duration=${encodeURIComponent(
    searchParams.duration || "",
  )}&fps=${encodeURIComponent(searchParams.fps || "")}`;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      const attempt = await signUp?.attemptVerification({
        code: data.pin,
        strategy: "email_code",
      });

      if (attempt?.status === "complete") {
        toast.success("success!", { icon: "🎉" });
        setTimeout(() => {
          window.location.href = `/auth${searchQueryString}`;
        }, 1000);
      } else {
        console.log(attempt);
      }
    } catch (e) {
      console.log(e);
      toast.error("invalid code");
      form.setValue("pin", "");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col items-center justify-center gap-2"
      >
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-2">
              <FormLabel className="text-left">
                Enter the code sent to your email.
              </FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field}>
                  <InputOTPGroup>
                    <InputOTPSlot className="h-16 w-16 text-lg" index={0} />
                    <InputOTPSlot className="h-16 w-16 text-lg" index={1} />
                    <InputOTPSlot className="h-16 w-16 text-lg" index={2} />
                    <InputOTPSlot className="h-16 w-16 text-lg" index={3} />
                    <InputOTPSlot className="h-16 w-16 text-lg" index={4} />
                    <InputOTPSlot className="h-16 w-16 text-lg" index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
