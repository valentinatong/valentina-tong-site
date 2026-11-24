import {textoCurto, textoRico} from './campos'
import {etiqueta} from './etiqueta'
import {curadoria} from './curadoria'
import {configuracoes, configProjetos} from './configuracoes'
import {projeto} from './projeto'
import {lugar, fotograma, configAtlas, tagAtlas} from './atlas'
import {home, bio} from './paginas'
import {publicacao} from './publicacao'

export const schemaTypes = [textoCurto, textoRico, etiqueta, curadoria, projeto, fotograma, lugar, tagAtlas, configAtlas, home, bio, configuracoes, configProjetos, publicacao]
