import { TOOLS } from './definitions/index.js';

export class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.registerAll(TOOLS);
    }

    registerAll(toolsArray) {
        toolsArray.forEach(tool => {
            this.tools.set(tool.name, tool);
        });
    }

    getToolSchemas() {
        return Array.from(this.tools.values()).map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
    }

    async execute(name, args, context) {
        if (!this.tools.has(name)) {
            throw new Error(`Tool non registrato: ${name}`);
        }

                let parsedArgs = args;
        if (typeof args === 'string') {
            try {
                parsedArgs = JSON.parse(args);
            } catch (e) {
                console.error("Errore parsing args in ToolRegistry", e);
                throw new Error("Argomenti tool non validi");
            }
        }

        const tool = this.tools.get(name);
        return await tool.execute(parsedArgs, context);
    }
}
