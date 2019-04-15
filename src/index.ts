import { IncomingMessage } from "http";
import { KaenContext } from "@kaenjs/core";
import { StandardRequestHeaders } from "@kaenjs/core/headers";

declare global {
	namespace KaenExtensible {
		interface KaenParameters {
            body:any,
            file:Buffer
		}
	}
}

const jsonTypes = [
    'application/json',
    'application/json-patch+json',
    'application/vnd.api+json',
    'application/csp-report',
];

// default form types
const formTypes = [
    'application/x-www-form-urlencoded',
];

// default text types
const textTypes = [
    'text/plain',
];
async function rawbody(stream: IncomingMessage) {
    return new Promise((resolve, reject)=> {
        let body = [];
        stream.on('data', (chunck)=>{
            body.push(chunck);
        }).on('end', ()=>{
            resolve(Buffer.concat(body));
        });
    }) as Promise<Buffer>;
}

export async function Parser (stream: IncomingMessage, fileTypes:string[]) {
    let raw_body = await rawbody(stream);
    let [content_type, encoding='utf-8'] = stream.headers[StandardRequestHeaders.ContentType].split(';');
    let body:any, file:Buffer;
    encoding = encoding.replace(/charset ?= ?/ig, '').trim();
    if(jsonTypes.indexOf(content_type) > -1 ) {
        body = JSON.parse(raw_body.toString(encoding));
    }
    if(textTypes.indexOf(content_type) > -1) {
        body = raw_body.toString();
	}
	if(formTypes.includes(content_type)) {
        let res = {};
        let string_body = raw_body.toString() || '';
		let pre = decodeURIComponent(string_body).split('&').filter(f=>f).map(chunk=>{
            const[key, value=''] = chunk.replace(/\+/g,' ').split('=');
			res[key] = value.trim();
		});
		body = res;
	}
	if(fileTypes.includes(content_type)) {
		file = raw_body;
	}
    return {body, file};
}
export function BodyParser({files=[]}:{files:string[]}) {
	return async function BodyParser(context:KaenContext) {
	    switch(context.req.method) {
            case 'GET': break;
            case 'POST':
            case 'PUT':
                let {body , file}  = await Parser(context.req, files);
                context.params.body =  body;
                context.params.file =  file;
                break;
        }
    }
}
