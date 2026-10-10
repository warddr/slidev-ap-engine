import { defineMermaidSetup } from '@slidev/types'

// AP-huisstijlkleuren i.p.v. mermaid's standaardthema, overgenomen uit de
// Hugo-site. Diagrammen met een eigen `style`/`classDef` houden die kleuren.
// Mermaid 12 tekent flowcharts met de ELK-layout; de 'classic'-look houdt de
// vlakke AP-vlakken (geen "neo"-schaduwranden). fontFamily = het lettertype
// van het thema, anders meet mermaid de labels met andere metrics en worden
// de vakjes te smal.
export default defineMermaidSetup(() => ({
  look: 'classic',
  fontFamily: 'Arial, Helvetica, sans-serif',
  theme: 'base',
  themeVariables: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    primaryColor: '#e3f4f6',
    primaryTextColor: '#222222',
    primaryBorderColor: '#009eae',
    lineColor: '#404040',
    secondaryColor: '#fdf1de',
    secondaryBorderColor: '#f69b00',
    tertiaryColor: '#e3f3ea',
    tertiaryBorderColor: '#1d9759',
    edgeLabelBackground: '#ffffff',
    clusterBkg: '#f2f2f2',
    clusterBorder: '#404040',
    actorBkg: '#e3f4f6',
    actorBorder: '#009eae',
    actorTextColor: '#222222',
    actorLineColor: '#404040',
    signalColor: '#404040',
    signalTextColor: '#222222',
    labelBoxBkgColor: '#e3f4f6',
    labelBoxBorderColor: '#009eae',
    labelTextColor: '#222222',
    loopTextColor: '#222222',
    noteBkgColor: '#fdf1de',
    noteBorderColor: '#f69b00',
    noteTextColor: '#222222',
    activationBkgColor: '#f2f2f2',
    activationBorderColor: '#404040',
    sequenceNumberColor: '#ffffff',
  },
}))
