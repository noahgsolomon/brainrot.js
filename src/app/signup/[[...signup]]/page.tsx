"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, useForm, FormProvider, SubmitHandler } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignUp } from "@clerk/nextjs";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import OneTimePassword from "./OneTimePassword";
import SignUpOAuthButtons from "./SignUpOAuthButtons";

const quotes = [
  {
    text: "The mind is everything. What you think you become.",
    author: "Buddha",
  },
  { text: "The brain is wider than the sky.", author: "Emily Dickinson" },
  { text: "What we think, we become.", author: "Buddha" },
  {
    text: "The mind is not a vessel to be filled but a fire to be kindled.",
    author: "Plutarch",
  },
  { text: "An idle brain is the devil's workshop.", author: "Proverb" },
  {
    text: "The human brain has 100 billion neurons, each neuron connected to 10 thousand other neurons. Sitting on your shoulders is the most complicated object in the known universe.",
    author: "Michio Kaku",
  },
  {
    text: "The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.",
    author: "John Milton",
  },
  {
    text: "The mind is like an iceberg, it floats with one-seventh of its bulk above water.",
    author: "Sigmund Freud",
  },
  {
    text: "The brain is like a muscle. When it is in use we feel very good. Understanding is joyous.",
    author: "Carl Sagan",
  },
  { text: "Earn with your mind, not your time.", author: "Naval Ravikant" },
];

function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

export default function Page({
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
  const formSchema = z.object({
    firstName: z.string().nonempty({ message: "First name is required." }),
    lastName: z.string().nonempty({ message: "Last name is required." }),
    email: z.string().email({ message: "Please provide a valid email." }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const { isLoaded, signUp, setActive } = useSignUp();
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState(false);

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
    if (!isLoaded) {
      return;
    }
    try {
      setPendingSignUp(true);

      await signUp.create({
        emailAddress: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        redirectUrl: "/auth",
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingSignUp(false);
      setPendingVerification(true);
    } catch (err: any) {
      setPendingSignUp(false);
      toast.error(err.errors[0].message);
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const randomQuote = useMemo(() => getRandomQuote(), []);

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

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Sign up</h1>
            <p className="text-balance text-muted-foreground">
              Enter your details below to sign up
            </p>
          </div>
          <div className="grid gap-4">
            {pendingVerification ? (
              <OneTimePassword searchParams={searchParams} />
            ) : (
              <FormProvider {...form}>
                <Form
                  className="flex flex-col gap-2"
                  /*@ts-ignore */
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <div className="flex flex-row gap-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              className="opacity-80"
                              {...field}
                              placeholder="John"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              className="opacity-80"
                              {...field}
                              placeholder="Doe"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            className="opacity-80"
                            {...field}
                            placeholder="johndoe@gmail.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button disabled={pendingSignUp} type="submit">
                    Sign up
                  </Button>
                </Form>
              </FormProvider>
            )}
            <div className="my-2 w-full border-b border-primary/20"></div>
            <SignUpOAuthButtons searchParams={searchParams} />
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href={`/login${searchQueryString}`} className="underline">
              Login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden h-full w-full items-center justify-center border-l border-border bg-muted/40 lg:flex">
        <p className="max-w-[60%] text-xl italic">
          "{randomQuote?.text}"<br></br> - {randomQuote?.author} 🧠💫🌀
        </p>
      </div>
    </div>
  );
}
