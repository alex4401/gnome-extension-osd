import * as Base from 'base';
import * as Osd from 'osd';


export class FExtension extends Base.FExtensionBase {
    private OsdManager!: Osd.FOsdSkinnerBase;

    constructor() {
        super();

        this.OsdManager = new Osd.FOsdSkinCompact();
    }

    public Enable(): void {
        // Enable newly instantiated components
        this.OsdManager.Enable();
    }

    public Disable(): void {
        this.OsdManager.Disable();
    }
}