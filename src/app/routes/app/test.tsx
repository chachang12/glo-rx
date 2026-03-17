import mockTest from "@/testing/mockTest.json"
import type { TestData } from "@/types";
import { TestLayout } from "@/features/practice-test/components/layout/TestLayout"

const isDev = new URLSearchParams(window.location.search).has("dev")
const isDevResults = new URLSearchParams(window.location.search).has("results")

export const Test = () => {
  return (
    <TestLayout
      initialData={isDev || isDevResults ? mockTest as TestData : null}
      initialCompleted={isDevResults}
    />
  )
}