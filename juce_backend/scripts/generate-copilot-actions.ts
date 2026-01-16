import fs from 'fs';
import path from 'path';

interface ApiParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
  items?: { type: string };
}

interface ApiAction {
  name: string;
  description: string;
  parameters: ApiParameter[];
}

interface ApiSchema {
  actions: ApiAction[];
}

function generateCopilotAction(action: ApiAction): string {
  const params = action.parameters.map(param => {
    let typeDef = `type: '${param.type}'`;
    if (param.enum) {
      typeDef += `, enum: [${param.enum.map(e => `'${e}'`).join(', ')}]`;
    }
    if (param.items) {
      typeDef += `, items: { type: '${param.items.type}' }`;
    }
    return `
      {
        name: '${param.name}',
        ${typeDef},
        description: '${param.description}',
        required: ${param.required},
      },`;
  }).join('');

  const handlerArgs = action.parameters.map(param => param.name).join(', ');

  return `
  useCopilotAction({
    name: '${action.name}',
    description: '${action.description}',
    parameters: [
      ${params}
    ],
    handler: async ({ ${handlerArgs} }) => {
      // TODO: Implement actual logic for ${action.name}
      console.log(`Executing ${action.name} with params: `, { ${handlerArgs} });
      return { success: true, message: `Action ${action.name} executed.` };
    },
  });
`;
}

function generateCopilotActionsFile(schema: ApiSchema): string {
  const imports = `import { useCopilotAction } from '@copilotkit/react-core';`;
  const actionsCode = schema.actions.map(generateCopilotAction).join('\n');

  return `
${imports}

// This file is auto-generated. Do not modify directly.
// Generated from API schema: ${new Date().toISOString()}

export function registerGeneratedCopilotActions() {
${actionsCode}
}
`;
}

// Example usage from command line:
// node -r ts-node/register scripts/generate-copilot-actions.ts <path_to_schema.json> <output_file.ts>
if (require.main === module) {
  const schemaFilePath = process.argv[2];
  const outputFilePath = process.argv[3];

  if (!schemaFilePath || !outputFilePath) {
    console.error('Usage: node -r ts-node/register scripts/generate-copilot-actions.ts <path_to_schema.json> <output_file.ts>');
    process.exit(1);
  }

  try {
    const schemaData = fs.readFileSync(schemaFilePath, 'utf8');
    const apiSchema: ApiSchema = JSON.parse(schemaData);

    const generatedCode = generateCopilotActionsFile(apiSchema);
    fs.writeFileSync(outputFilePath, generatedCode);
    console.log(`Successfully generated Copilot actions to ${outputFilePath}`);
    process.exit(0);
  } catch (error: any) {
    console.error('Error generating Copilot actions:', error.message);
    process.exit(1);
  }
}
