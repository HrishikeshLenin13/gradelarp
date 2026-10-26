import {it,expect} from 'vitest';
import * as api from '../src/lib/calculations';
import {defaultPolicy} from '../src/lib/model';
import type {Course,Assignment} from '../src/lib/model';
const work={id:'a',name:'Work',categoryId:'c',status:'graded',earned:80,possible:100} as Assignment;
const course={id:'c',mode:'points',credits:1,level:'Regular',categories:[{id:'c',weight:100}],assignments:[work]} as unknown as Course;
it('returns unknown rather than poisoned totals for invalid included values',()=>{for(const possible of [NaN,Infinity,-1])expect(api.courseGrade({...course,assignments:[{...work,possible}]})).toBeNull();expect(api.courseGrade({...course,assignments:[{...work,earned:Infinity}]})).toBeNull();expect(api.courseGrade({...course,assignments:[work,{...work,id:'extra',possible:0,earned:5}]})).toBe(85);});
