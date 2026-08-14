import type { CollectionConfig } from "payload";

import { publicCreateContentAccess } from "./access";
import { locationField, slugField } from "./fields";

export const Diving: CollectionConfig = {
  slug: "diving",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "siteName", "draft"],
    group: "Diving",
  },
  access: publicCreateContentAccess,
  fields: [
    { name: "title", type: "text", required: true, maxLength: 99 },
    slugField,
    { name: "date", type: "date", required: true },
    {
      name: "summary",
      type: "textarea",
      required: true,
      maxLength: 280,
      defaultValue: "Dive log entry.",
    },
    { name: "tags", type: "text", hasMany: true },
    { name: "cover", type: "upload", relationTo: "media" },
    { name: "draft", type: "checkbox", defaultValue: false },
    { name: "featured", type: "checkbox", defaultValue: false },

    {
      name: "shearwaterId",
      type: "text",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "Set from Shearwater CSV import (serial:dive#:start).",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "diveNumber",
          type: "number",
          min: 0,
          admin: { width: "33%" },
        },
        {
          name: "startTime",
          type: "text",
          admin: { width: "33%", description: "e.g. 9:53 AM" },
        },
        {
          name: "endTime",
          type: "text",
          admin: { width: "33%", description: "e.g. 10:48 AM" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "siteName",
          type: "text",
          label: "Location",
          admin: { width: "50%" },
        },
        {
          name: "siteDetail",
          type: "text",
          label: "Site",
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "buddyOrShop",
      type: "text",
      label: "Buddy",
    },
    locationField,

    {
      name: "vitals",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "maxDepthMeters",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "avgDepthMeters",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "bottomTimeMinutes",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "visibilityMeters",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "surfaceTempC",
              type: "number",
              admin: { width: "33%" },
            },
            {
              name: "bottomTempC",
              type: "number",
              admin: { width: "33%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "avgTempC",
              type: "number",
              admin: { width: "33%" },
            },
            {
              name: "surfacePressureMbar",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "weightLbs",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "gasType",
              type: "select",
              defaultValue: "air",
              options: [
                { label: "Air", value: "air" },
                { label: "Nitrox", value: "nitrox" },
                { label: "Trimix", value: "trimix" },
                { label: "Other", value: "other" },
              ],
              admin: { width: "33%" },
            },
            {
              name: "sac",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
            {
              name: "startPressurePsi",
              type: "number",
              min: 0,
              admin: { width: "33%" },
            },
          ],
        },
        {
          name: "endPressurePsi",
          type: "number",
          min: 0,
        },
      ],
    },

    {
      name: "environment",
      type: "group",
      fields: [
        {
          name: "airTempC",
          type: "number",
        },
        {
          name: "visibility",
          type: "text",
          admin: { description: "Free text or meters" },
        },
        {
          name: "weather",
          type: "select",
          options: [
            { label: "Clear", value: "clear" },
            { label: "Cloudy", value: "cloudy" },
            { label: "Rain", value: "rain" },
            { label: "Wind", value: "wind" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "platform",
          type: "select",
          options: [
            { label: "Shore", value: "shore" },
            { label: "Boat", value: "boat" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "environmentType",
          type: "select",
          label: "Environment",
          options: [
            { label: "Ocean", value: "ocean" },
            { label: "Lake", value: "lake" },
            { label: "Quarry", value: "quarry" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "conditions",
          type: "select",
          options: [
            { label: "Calm", value: "calm" },
            { label: "Current", value: "current" },
            { label: "Surge", value: "surge" },
            { label: "Other", value: "other" },
          ],
        },
        { name: "notes", type: "textarea", label: "Environment notes" },
      ],
    },

    {
      name: "problems",
      type: "group",
      fields: [
        {
          name: "thermalComfort",
          type: "select",
          options: [
            { label: "Cold", value: "cold" },
            { label: "Cool", value: "cool" },
            { label: "Comfortable", value: "comfortable" },
            { label: "Warm", value: "warm" },
            { label: "Hot", value: "hot" },
          ],
        },
        {
          name: "equipmentMalfunction",
          type: "select",
          options: [
            { label: "None", value: "none" },
            { label: "Minor", value: "minor" },
            { label: "Yes", value: "yes" },
          ],
        },
        {
          name: "equipmentMalfunctionNotes",
          type: "textarea",
          label: "Equipment malfunction notes",
          admin: {
            description: "Describe what happened when malfunction is not none.",
          },
        },
        {
          name: "workload",
          type: "select",
          options: [
            { label: "Light", value: "light" },
            { label: "Moderate", value: "moderate" },
            { label: "Heavy", value: "heavy" },
          ],
        },
        { name: "anySymptoms", type: "text" },
        { name: "problems", type: "text" },
        {
          name: "exposureToAltitude",
          type: "select",
          options: [
            { label: "No", value: "no" },
            { label: "Yes", value: "yes" },
          ],
        },
        { name: "notes", type: "textarea", label: "Problems notes" },
        {
          name: "postDiveCheckup",
          type: "textarea",
          label: "Post-dive checkup",
          admin: {
            description: "How you felt after the dive / any checkup notes.",
          },
        },
      ],
    },

    {
      name: "gearWorn",
      type: "group",
      label: "Gear",
      fields: [
        {
          name: "dress",
          type: "select",
          options: [
            { label: "Dry Suit", value: "dry-suit" },
            { label: "Wet Suit", value: "wet-suit" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "apparatus",
          type: "select",
          options: [
            { label: "Single Tank", value: "single-tank" },
            { label: "Doubles", value: "doubles" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "tankSize",
          type: "select",
          options: [
            { label: "AL80", value: "AL80" },
            { label: "HP100", value: "HP100" },
            { label: "HP80", value: "HP80" },
          ],
        },
        { name: "notes", type: "textarea", label: "Gear notes" },
      ],
    },

    {
      name: "equipmentConfig",
      type: "relationship",
      relationTo: "gear-configs",
    },
    {
      name: "photos",
      type: "upload",
      relationTo: "media",
      hasMany: true,
    },
    {
      name: "skills",
      type: "relationship",
      relationTo: "dive-skills",
      hasMany: true,
    },

    {
      name: "notes",
      type: "group",
      fields: [
        {
          name: "diveNotes",
          type: "textarea",
          label: "Dive notes",
        },
        { name: "skillsPracticed", type: "textarea" },
        {
          name: "buddyNotes",
          type: "textarea",
          label: "Dive Buddies & Team Notes",
        },
        {
          name: "thermalComfort",
          type: "textarea",
          admin: {
            description: "Legacy free text; prefer Problems → Thermal comfort.",
          },
        },
        { name: "trimNotes", type: "textarea", label: "Trim Observations" },
        {
          name: "gearIssues",
          type: "textarea",
          label: "Gear Function / Issues",
        },
        {
          name: "environmentalNotes",
          type: "textarea",
          label: "Environmental Notes (legacy)",
        },
        {
          name: "lessonsLearned",
          type: "textarea",
          label: "Lessons Learned / Improvements",
        },
      ],
    },

    {
      name: "profileSamples",
      type: "json",
      admin: {
        description:
          "Shearwater CSV sample points { t, d, temp? } — used for the profile chart.",
        readOnly: true,
      },
    },

    {
      name: "body",
      type: "richText",
      admin: {
        description: "Optional freeform write-up beyond the structured notes.",
      },
    },
  ],
};
