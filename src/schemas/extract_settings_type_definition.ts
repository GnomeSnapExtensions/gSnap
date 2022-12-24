import * as fs from 'fs';
import { JSDOM } from 'jsdom';

import yargs from 'yargs';

/**
 * ConfigKey corresponds to the <key> elements inside of the <schemalist><shema>
 * element in the gschema.xml file.
 */
interface ConfigKey {
    name: string;

    /**
     * One of "as", ....
     */
    typeRaw: string;

    type: KeyType;

    /**
     * The string formatted default value.
     */
    defaultLexicalForm: string;

    /**
     * Description of the key.
     */
    summary: string;
}

/**
 * KeyType is a subset of GVariant types supported by this code generator.
 *
 * Documentation of GVariant is here:
 * https://developer.gnome.org/glib/stable/glib-GVariant.html. It is fairly
 * verbose and hard to tell exactly what the type model is. This file seems
 * pretty relevant:
 * https://github.com/GNOME/glib/blob/master/glib/gvarianttype.h.
 */
enum KeyType {
    Boolean = "b",
    String = "s",
    StringArray = "as",
    Int32 = "i",
};

function lookupKeyType(value: string): KeyType | null {
    return Object.values(KeyType).find(v => v === value) || null;
}

async function main() {
    const argv = await yargs(process.argv.slice(2)).options({
        gschema_xml: {
            type: 'string',
            demandOption: true,
            description: 'path to schemas/org.gnome.shell.extensions.gsnap.gschema.xml',
            default: "schemas/org.gnome.shell.extensions.gsnap.gschema.xml"
        },
        output_ts: {
            type: 'string',
            demandOption: true,
            description: 'path to output .ts file',
            default: "settings_data.ts"
        },
    }).argv;

    console.log(`Hello, world! reading from ${argv.gschema_xml}, writing to ${argv.output_ts}.`);
    const xml = fs.readFileSync(argv.gschema_xml);
    const keys = parseKeys(xml).sort((a, b): number => {
        return a.name.localeCompare(b.name);
    });
    const code = generateTypeDefinition(keys);
    fs.writeFileSync(argv.output_ts, code, {
        encoding: 'utf-8',
    });
    console.log("output code to %s", argv.output_ts);
}

function generateTypeDefinition(keys: ConfigKey[]): string {
    function settingType(typeName: string, members: ConfigKey[]): string {
        return `export type ${typeName} = (
    ${members.map(k => JSON.stringify(k.name)).join(" |\n    ")});`;
    }

    const settings = {
        [KeyType.Boolean]: keys.filter(k => k.type === KeyType.Boolean),
        [KeyType.Int32]: keys.filter(k => k.type === KeyType.Int32),
        [KeyType.String]: keys.filter(k => k.type === KeyType.String),
        [KeyType.StringArray]: keys.filter(k => k.type === KeyType.StringArray)
    }
    
    for(let s in settings) {
        let type = s as KeyType;
        let collection = settings[type];

        if(collection.length == 0) {
            collection.push({
                name: "",
                type: type,
                defaultLexicalForm: "",
                summary: "",
                typeRaw: type.toString(),
            })
        }
    }

    const interfaceEntries = keys.map((key: ConfigKey): string => {
        return `/** ${key.summary} */
    [${JSON.stringify(key.name)}]: ${keyTypeToTypescriptType(key.type)} = ${key.defaultLexicalForm};`;
    });

    const constantEntries = keys.map((key: ConfigKey): string => {
        let constName = key.name.toUpperCase().replace(/-/g , '_');
        return `export const ${constName} = "${key.name}";`;
    });

    return `// GENERATED CODE: DO NOT EDIT
//
// Run extract_settings_type_definitions instead.


// Valid boolean settings
${settingType('BoolSettingName', settings[KeyType.Boolean])}

// A setting name for a number-valued setting.
${settingType('NumberSettingName', settings[KeyType.Int32])}

// A setting for a key binding i.e. a 'preset' in the app.ts code.
${settingType('KeyBindingSettingName', settings[KeyType.StringArray])}

// A setting name for a string-valued setting.
${settingType('StringSettingName', settings[KeyType.String])}

// Any valid setting name.
${settingType('AnySettingName', keys)}

export class ParsedSettings {
    ${interfaceEntries.join("\n\n    ")}
}

${constantEntries.join("\n")}
`;
}


function keyTypeToTypescriptType(keyType: KeyType): string {
    switch (keyType) {
        case KeyType.Boolean: return "boolean";
        case KeyType.String: return "string";
        case KeyType.StringArray: return "string[]";
        case KeyType.Int32: return "number";
    }
}

function parseKeys(xml: Buffer): ConfigKey[] {
    const dom = new JSDOM(xml.toString(),
        {
            contentType: "application/xml",
        });
    const keyElems = dom.window.document.querySelectorAll('schemalist > schema > key');
    const keys: ConfigKey[] = [];
    keyElems.forEach((elem: Element) => {
        const name = elem.getAttribute('name');
        if (!name) {
            throw new Error('key is missing name attribute');
        }
        const type = parseType(elem.getAttribute('type'));
        keys.push({
            name,
            type,
            typeRaw: type.toString(),
            summary: mustGetChildText(elem, 'summary'),
            defaultLexicalForm: mustGetChildText(elem, 'default'),
        });
    });
    return keys;
}

function parseType(t: string | null): KeyType {
    if (t === null) {
        throw new Error(`invalid type (empty attribute)`);
    }
    const got = lookupKeyType(t);
    if (!got) {
        throw new Error(`invalid type ${t}`);
    }
    return got;
}

function mustGetChildText(elem: Element, childName: string): string {
    const gotText = elem.querySelector(`${childName}`)?.textContent;
    if (gotText === undefined || gotText == null) {
        throw new Error(`missing child element ${childName}`);
    }
    return gotText;
}

main();