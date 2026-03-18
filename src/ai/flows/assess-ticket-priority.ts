'use server';
/**
 * @fileOverview This file defines a Genkit flow for assessing the priority of flood distress tickets.
 *
 * - assessTicketPriority - A function that takes distress ticket details and returns an AI-assigned priority.
 * - AssessTicketPriorityInput - The input type for the assessTicketPriority function.
 * - AssessTicketPriorityOutput - The return type for the assessTicketPriority function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EmergencyTypeSchema = z.enum([
  'Trapped',
  'Injured',
  'Medical emergency',
  'Food/Water shortage',
  'Elderly/Child rescue',
  'Other',
]);

const AssessTicketPriorityInputSchema = z.object({
  emergencyType: EmergencyTypeSchema.describe('The type of emergency reported.'),
  numberOfPeople: z
    .number()
    .min(1)
    .describe('The number of people affected by the emergency.'),
  notes: z
    .string()
    .optional()
    .describe('Additional free-text notes provided by the citizen.'),
  mediaDataUris: z
    .array(z.string())
    .optional()
    .describe(
      "An array of photo/video data URIs that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AssessTicketPriorityInput = z.infer<
  typeof AssessTicketPriorityInputSchema
>;

const AssessTicketPriorityOutputSchema = z.object({
  priority: z
    .enum(['Critical', 'High', 'Medium', 'Low'])
    .describe("The AI-assigned priority level for the distress ticket."),
  reasoning: z
    .string()
    .describe("The AI's reasoning for assigning the specific priority level."),
});
export type AssessTicketPriorityOutput = z.infer<
  typeof AssessTicketPriorityOutputSchema
>;

const prompt = ai.definePrompt({
  name: 'assessTicketPriorityPrompt',
  input: { schema: AssessTicketPriorityInputSchema },
  output: { schema: AssessTicketPriorityOutputSchema },
  prompt: `You are an AI assistant specialized in assessing the urgency of flood distress tickets.
Your goal is to assign a priority level ('Critical', 'High', 'Medium', 'Low') based on the provided details and provide a clear reasoning for your decision.

Consider the following criteria for each priority level:
- 'Critical': Immediate life-threatening situation, large number of people at extreme risk, severe medical emergencies, or urgent child/elderly rescue in dangerous conditions.
- 'High': Significant danger to life or health, major food/water shortage impacting many, or trapped individuals in rising water with potential for escalation.
- 'Medium': Non-immediate but developing threats, moderate food/water shortage, or trapped individuals in stable but inaccessible locations where immediate danger is not critical.
- 'Low': Minor inconveniences, non-urgent requests, or situations where immediate danger is minimal or easily manageable.

Analyze the following distress ticket details:

Emergency Type: {{{emergencyType}}}
Number of People Affected: {{{numberOfPeople}}}
Additional Notes: {{{notes}}}

{{#if mediaDataUris}}
Uploaded Media:
{{#each mediaDataUris}}
{{media url=this}}
{{/each}}
{{/if}}

Based on the information above, what is the most appropriate priority level and the reasoning for your decision?`,
});

const assessTicketPriorityFlow = ai.defineFlow(
  {
    name: 'assessTicketPriorityFlow',
    inputSchema: AssessTicketPriorityInputSchema,
    outputSchema: AssessTicketPriorityOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function assessTicketPriority(
  input: AssessTicketPriorityInput
): Promise<AssessTicketPriorityOutput> {
  return assessTicketPriorityFlow(input);
}
