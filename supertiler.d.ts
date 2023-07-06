declare module 'supertiler' {
    import { AnyProps, Options } from 'supercluster'

    export type SupertilerOptions = Options<AnyProps, AnyProps> & {
        input: string;
        output: string;
    
        storeClusterExpansionZoom?: boolean;
        bounds?: string;
        center?: string;
        tileSpecVersion?: number;
    }
    
    export default function supertiler(options: SupertilerOptions): Promise<void>;
}