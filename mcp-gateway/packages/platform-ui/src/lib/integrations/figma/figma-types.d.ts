/**
 * Figma API Types
 * Epic 11: External Integrations
 */
export interface FigmaFile {
    document: FigmaNode;
    components: Record<string, FigmaComponent>;
    schemaVersion: number;
    styles: Record<string, FigmaStyle>;
    name: string;
    lastModified: string;
    thumbnailUrl: string;
    version: string;
}
export interface FigmaNode {
    id: string;
    name: string;
    type: FigmaNodeType;
    children?: FigmaNode[];
    absoluteBoundingBox?: BoundingBox;
    constraints?: Constraints;
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
    effects?: Effect[];
    opacity?: number;
    visible?: boolean;
    locked?: boolean;
    characters?: string;
    style?: TextStyle;
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    itemSpacing?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
    cornerRadius?: number;
    rectangleCornerRadii?: [number, number, number, number];
}
export interface TextStyle {
    fontFamily: string;
    fontPostScriptName?: string;
    fontStyle?: string;
    fontWeight: number;
    fontSize: number;
    textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    letterSpacing?: number;
    lineHeightPx?: number;
    lineHeightPercent?: number;
    lineHeightUnit?: string;
}
export type FigmaNodeType = 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'VECTOR' | 'BOOLEAN_OPERATION' | 'STAR' | 'LINE' | 'ELLIPSE' | 'REGULAR_POLYGON' | 'RECTANGLE' | 'TEXT' | 'SLICE' | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE' | 'IMAGE';
export interface FigmaComponent {
    key: string;
    name: string;
    description: string;
    componentSetId?: string;
}
export interface FigmaStyle {
    key: string;
    name: string;
    styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
    description: string;
}
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Constraints {
    vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
    horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}
export interface Paint {
    type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
    visible?: boolean;
    opacity?: number;
    color?: Color;
    imageRef?: string;
    scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}
export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}
export interface Effect {
    type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    visible: boolean;
    radius: number;
    color?: Color;
    offset?: {
        x: number;
        y: number;
    };
    spread?: number;
}
export interface FigmaClientConfig {
    accessToken: string;
    baseUrl?: string;
    timeout?: number;
}
export interface GetFileOptions {
    version?: string;
    ids?: string[];
    depth?: number;
    geometry?: 'paths' | 'bounds';
}
export interface GetImageOptions {
    ids: string[];
    scale?: number;
    format?: 'jpg' | 'png' | 'svg' | 'pdf';
}
export interface FigmaImageResponse {
    images: Record<string, string>;
    err?: string;
}
//# sourceMappingURL=figma-types.d.ts.map