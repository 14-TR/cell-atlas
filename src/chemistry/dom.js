export const $ = id => document.getElementById(id);
export function make(tag,text,attributes={}) {
  const el=document.createElement(tag);if(text!==undefined)el.textContent=text;
  for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);
  return el;
}
