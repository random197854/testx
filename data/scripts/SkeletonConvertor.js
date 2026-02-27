(() => {
    function version3Conversion(skel) {
        /**
         * Bones
         * transform -> inherit
         * 
         * Transform
         * rotateMix, translateMix, scaleMix, shearMix - REMOVED
         * mixRotate, mixX, mixScaleX, mixShearY - ADDED
         * 
         */

        for (const bone of skel.bones) {
            if (bone.transform) {
                bone.inherit = bone.transform
                delete bone.transform;
            }
        }

        if ("transform" in skel) {
            for (const transform of skel.transform) {
                updateTransforms(transform);
            }
        }

        if ("skins" in skel && !Array.isArray(skel.skins)) {
            //Pre 3.8 skins were objects
            const skins = [];
            for (const skinName in skel.skins) {
                skins.push({
                    name: skinName,
                    attachments: skel.skins[skinName],
                });
            }
            skel.skins = skins;
        }


        for (const animationName in skel.animations) {
            const animation = skel.animations[animationName];

            if (animation.bones) {
                for (const boneName in animation.bones) {
                    const bone = animation.bones[boneName]

                    if (bone.rotate) {
                        for (const rotation of bone.rotate) {
                            if ("angle" in rotation) {
                                if (rotation.angle > 225) {
                                    rotation.value = round(rotation.angle - 360, 2);
                                } else if (rotation.angle < -225) {
                                    rotation.value = round(rotation.angle + 360, 2);
                                } else {
                                    rotation.value = rotation.angle;
                                }
                                delete rotation.angle;
                            }
                        }
                        for (const [index, rotation] of bone.rotate.entries()) {
                            if (hasCurve(rotation)) {
                                const time = rotation.time ?? 0;
                                const next = bone.rotate[index + 1];
                                const duration = next.time - time;
                                const value = rotation.value ?? 0;
                                const length = (next.value ?? 0) - value;

                                rotation.curve = convertCurve(
                                    value,
                                    length,
                                    time,
                                    duration,
                                    ...getCurveData(rotation)
                                );


                            }
                        }
                    }

                    if (bone.shear) {
                        for (const [index, shear] of bone.shear.entries()) {
                            if (hasCurve(shear)) {
                                const time = shear.time ?? 0;
                                const next = bone.shear[index + 1];
                                const duration = next.time - time;
                                const x = shear.x ?? 0;
                                const y = shear.y ?? 0;
                                const nextX = next.x ?? 1;
                                const nextY = next.y ?? 1;

                                const curveData = getCurveData(shear);

                                shear.curve = [
                                    ...convertCurve(
                                        x,
                                        nextX - x,
                                        time,
                                        duration,
                                        ...curveData
                                    ),
                                    ...convertCurve(
                                        y,
                                        nextY - y,
                                        time,
                                        duration,
                                        ...curveData
                                    )
                                ];
                            }
                        }
                    }

                    if (bone.translate) {
                        for (const [index, translation] of bone.translate.entries()) {
                            if (hasCurve(translation)) {
                                const time = translation.time ?? 0;
                                const next = bone.translate[index + 1];
                                const duration = next.time - time;
                                const x = translation.x ?? 0;
                                const y = translation.y ?? 0;
                                const nextX = next.x ?? 1;
                                const nextY = next.y ?? 1;

                                const curveData = getCurveData(translation);

                                translation.curve = [
                                    ...convertCurve(
                                        x,
                                        nextX - x,
                                        time,
                                        duration,
                                        ...curveData
                                    ),
                                    ...convertCurve(
                                        y,
                                        nextY - y,
                                        time,
                                        duration,
                                        ...curveData
                                    )
                                ];
                            }
                        }
                    }

                    if (bone.scale) {
                        for (const [index, scale] of bone.scale.entries()) {
                            if (hasCurve(scale)) {
                                const time = scale.time ?? 0;
                                const next = bone.scale[index + 1];
                                const duration = next.time - time;
                                const x = scale.x ?? 1;
                                const y = scale.y ?? 1;
                                const nextX = next.x ?? 1;
                                const nextY = next.y ?? 1;

                                const curveData = getCurveData(scale);

                                scale.curve = [
                                    ...convertCurve(
                                        x,
                                        nextX - x,
                                        time,
                                        duration,
                                        ...curveData
                                    ),
                                    ...convertCurve(
                                        y,
                                        nextY - y,
                                        time,
                                        duration,
                                        ...curveData
                                    )
                                ];
                            }
                        }
                    }

                }
            }

            if (animation.slots) {
                for (const slotName in animation.slots) {
                    const slot = animation.slots[slotName];
                    if ("color" in slot) {
                        slot.rgba = slot.color;
                        delete slot.color;
                    }
                    if ("rgba" in slot) {
                        for (const [index, rgba] of slot.rgba.entries()) {
                            if (hasCurve(rgba)) {
                                const time = rgba.time ?? 0;
                                const next = slot.rgba[index + 1];
                                const duration = next.time - time;
                                const color = rgba.color;

                                const curveData = getCurveData(rgba);

                                const curve = [];
                                for (let i = 0; i < 8; i += 2) {
                                    const value = parseInt(color.substring(i, i + 2), 16) / 255;
                                    const length = (parseInt(next.color.substring(i, i + 2), 16) / 255) - value;
                                    curve.push(...convertCurve(
                                        value,
                                        length,
                                        time,
                                        duration,
                                        ...curveData
                                    ));
                                }
                                rgba.curve = curve;
                                delete rgba.c2;
                                delete rgba.c3;
                                delete rgba.c4;
                            }
                        }
                    }
                }
            }

            if (animation.transform) {
                for (const transformName in animation.transform) {
                    const transforms = animation.transform[transformName];
                    for (const transform of transforms) {
                        updateTransforms(transform);
                    }
                }
            }
        }
    }

    function round(number, decimals) {
        return Math.round(number * 10 ** decimals) / 10 ** decimals;
    }

    function convertCurve(
        value,
        length,
        time,
        duration,
        curve = 0,
        c2 = 0,
        c3 = 1,
        c4 = 1,
    ) {
        const cx1 = round(time + (curve * duration), 3);
        const cy1 = round(value + (length * c2), 2);
        const cx2 = round(time + (c3 * duration), 3);
        const cy2 = round(value + (length * c4), 2);

        return [cx1, cy1, cx2, cy2];
    }

    function hasCurve(obj) {
        if ("curve" in obj && obj.curve !== "stepped") {
            return true
        }
        return false;
    }

    function updateTransforms(transform) {
        if ("rotateMix" in transform) {
            transform.mixRotate = transform.rotateMix;
            delete transform.rotateMix
        }
        if ("scaleMix" in transform) {
            transform.mixScaleX = transform.scaleMix;
            delete transform.scaleMix
        }
        if ("shearMix" in transform) {
            transform.mixShearY = transform.shearMix;
            delete transform.shearMix
        }
        if ("translateMix" in transform) {
            transform.mixX = transform.translateMix;
            delete transform.translateMix
        }
    }

    function getCurveData(data) {
        if (Array.isArray(data.curve)) {
            return data.curve;
        }
        const cx1 = data.curve;
        const cx2 = data.c3;
        const cy1 = data.c2;
        const cy2 = data.c4;
        delete data.c2;
        delete data.c3;
        delete data.c4;
        return [cx1, cy1, cx2, cy2];
    }

    /**
     * Changes
     * Various property names were changed but with no change in the value type.
     * Some properties changed from a single value to two values e.g. Transform
     * constraints translateMix became mixX and mixY in these cases translateMix's 
     * value is set to both.
     * Linked Meshes in v4 use skinIndex whereas v3 uses skinName. Reverted to using
     * skinName as skinIndex is only used once where skinName can be used instead.
     */

    class SkeletonBinaryUpgrader {
        scale = 1;
        attachmentLoader;

        linkedMeshes = [];
        ver = {
            major: 0,
            minor: 0,
            patch: 0,
            extra: ""
        }

        constructor(attachmentLoader) {
            this.attachmentLoader = attachmentLoader;
        }

        readSkeletonData(binary) {
            const scale = this.scale;

            const skeletonData = new spine.SkeletonData();
            skeletonData.name = "";

            const input = new spine.BinaryInput(binary);

            skeletonData.hash = input.readString();
            skeletonData.version = input.readString();

            this.ver = getVer(skeletonData.version);

            if (this.ver.minor > 7) {
                skeletonData.x = input.readFloat();
                skeletonData.y = input.readFloat();
            }
            skeletonData.width = input.readFloat();
            skeletonData.height = input.readFloat();

            const nonessential = input.readBoolean();
            if (nonessential) {
                skeletonData.fps = input.readFloat();
                skeletonData.imagesPath = input.readString();
                if (this.ver.minor > 6) {
                    skeletonData.audioPath = input.readString();
                }
            }

            let n = 0;

            // Strings
            if (this.ver.minor > 7) {
                n = input.readInt(true);
                for (let i = 0; i < n; i++) {
                    const str = input.readString()
                    if (!str) {
                        throw new Error("[Spine]: Strings in string table cannot be null.");
                    }
                    input.strings.push(str);
                }
            }


            // Bones
            n = input.readInt(true);
            for (let i = 0; i < n; i++) {
                const name = input.readString();
                if (!name) {
                    throw new Error("[Spine]: Bone name must not be null.");
                }

                const parent = i === 0 ? null : skeletonData.bones[input.readInt(true)];
                const data = new spine.BoneData(i, name, parent);

                data.rotation = input.readFloat();
                data.x = input.readFloat() * scale;
                data.y = input.readFloat() * scale;
                data.scaleX = input.readFloat();
                data.scaleY = input.readFloat();
                data.shearX = input.readFloat();
                data.shearY = input.readFloat();
                data.length = input.readFloat() * scale;
                // CHECK
                data.inherit = input.readInt(true);
                if (this.ver.minor > 7) {
                    data.skinRequired = input.readBoolean();
                }
                if (nonessential) {
                    spine.Color.rgba8888ToColor(data.color, input.readInt32());
                }

                skeletonData.bones.push(data);
            }

            // Slots
            n = input.readInt(true);
            for (let i = 0; i < n; i++) {
                const slotName = input.readString();
                if (!slotName) {
                    throw new Error("[Spine]: Slot name must not be null.");
                }

                const boneData = skeletonData.bones[input.readInt(true)];
                const data = new spine.SlotData(i, slotName, boneData);

                spine.Color.rgba8888ToColor(data.color, input.readInt32());

                const darkColor = input.readInt32();
                if (darkColor !== -1) {
                    data.darkColor = new spine.Color();
                    Color.rgb888ToColor(data.darkColor, darkColor);
                }

                data.attachmentName = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                // CHECK
                data.blendMode = input.readInt(true);

                skeletonData.slots.push(data);
            }

            // IK constraints
            n = input.readInt(true);
            for (let i = 0, nn; i < n; i++) {
                const name = input.readString();
                if (!name) {
                    throw new Error("[Spine]: IK constraint name must not be null.");
                }

                const data = new spine.IkConstraintData(name);
                data.order = input.readInt(true);
                if (this.ver.minor > 7) {
                    data.skinRequired = input.readBoolean();
                }

                nn = input.readInt(true);
                for (let ii = 0; ii < nn; ii++) {
                    data.bones.push(skeletonData.bones[input.readInt(true)]);
                }

                data.target = skeletonData.bones[input.readInt(true)];
                data.mix = input.readFloat();
                if (this.ver.minor > 7) {
                    data.softness = input.readFloat() * scale;
                }
                data.bendDirection = input.readByte();
                if (this.ver.minor > 6) {
                    data.compress = input.readBoolean();
                    data.stretch = input.readBoolean();
                    data.uniform = input.readBoolean();
                }

                skeletonData.ikConstraints.push(data);
            }

            // Transform constraints
            n = input.readInt(true);
            for (let i = 0, nn; i < n; i++) {
                const name = input.readString();
                if (!name) {
                    throw new Error("[Spine]: Transform constraint name must not be null.");
                }

                const data = new spine.TransformConstraintData(name);
                data.order = input.readInt(true);
                if (this.ver.minor > 7) {
                    data.skinRequired = input.readBoolean();
                }

                nn = input.readInt(true);
                for (let ii = 0; ii < nn; ii++) {
                    data.bones.push(skeletonData.bones[input.readInt(true)]);
                }

                data.target = skeletonData.bones[input.readInt(true)];
                data.local = input.readBoolean();
                data.relative = input.readBoolean();
                data.offsetRotation = input.readFloat();
                data.offsetX = input.readFloat() * scale;
                data.offsetY = input.readFloat() * scale;
                data.offsetScaleX = input.readFloat();
                data.offsetScaleY = input.readFloat();
                data.offsetShearY = input.readFloat();
                data.mixRotate = input.readFloat();
                data.mixX = input.readFloat();
                data.mixY = data.mixX;
                data.mixScaleX = input.readFloat();
                data.mixScaleY = data.mixScaleX;
                data.mixShearY = input.readFloat();

                skeletonData.transformConstraints.push(data);
            }

            // Path constraints
            n = input.readInt(true);
            for (let i = 0, nn; i < n; i++) {
                const name = input.readString();
                if (!name) {
                    throw new Error("[Spine]: Path constraint name must not be null.");
                }

                const data = new spine.PathConstraintData(name);
                data.order = input.readInt(true);
                if (this.ver.minor > 7) {
                    data.skinRequired = input.readBoolean();
                }

                nn = input.readInt(true);
                for (let ii = 0; ii < nn; ii++) {
                    data.bones.push(skeletonData.bones[input.readInt(true)]);
                }

                data.target = skeletonData.slots[input.readInt(true)];
                // CHECK x3
                data.positionMode = input.readInt(true);
                data.spacingMode = input.readInt(true);
                data.rotateMode = input.readInt(true);
                data.offsetRotation = input.readFloat();
                data.position = input.readFloat();
                if (data.positionMode === PositionMode.Fixed) {
                    data.position *= scale;
                }
                data.spacing = input.readFloat();
                if (data.spacingMode === SpacingMode.Length || data.spacingMode === SpacingMode.Fixed) {
                    data.spacing *= scale;
                }
                data.mixRotate = input.readFloat();
                data.mixX = input.readFloat();
                data.mixY = data.mixX;

                skeletonData.pathConstraints.push(data);
            }

            // Default skin
            const defaultSkin = this.ver.minor > 7 ?
                this.readSkin_3_8(input, skeletonData, true, nonessential) :
                this.readSkin(input, skeletonData, "default", nonessential);

            if (defaultSkin !== null) {
                skeletonData.defaultSkin = defaultSkin;
                skeletonData.skins.push(defaultSkin);
            }

            // Skins
            if (this.ver.minor > 7) {
                for (let ii = skeletonData.skins.length, nn = ii + input.readInt(true); ii < nn; ii++) {
                    const skin = this.readSkin_3_8(input, skeletonData, false, nonessential);
                    if (skin) {
                        skeletonData.skins[ii] = skin;
                    }
                }
            } else {
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const skinName = input.readString();
                    if (!skinName) {
                        throw new Error("[Spine]: Skin name must not be null.")
                    }
                    const skin = this.readSkin(input, skeletonData, skinName, nonessential);
                    if (skin) {
                        skeletonData.skins.push(skin);
                    }
                }
            }


            // Linked Meshes
            n = this.linkedMeshes.length;
            for (let i = 0; i < n; i++) {
                const linkedMesh = this.linkedMeshes[i];

                const skin = linkedMesh.skinName === null ? skeletonData.defaultSkin : skeletonData.findSkin(linkedMesh.skinName);
                if (!skin) {
                    throw new Error(`[Spine]: Skin not found ${linkedMesh.skinName}`);
                }

                const parentName = linkedMesh.parent
                if (!parentName) {
                    throw new Error(`[Spine]: Parent name not found ${parentName}`);
                }

                const parent = skin.getAttachment(linkedMesh.slotIndex, parentName);
                if (!parent) {
                    throw new Error(`[Spine]: Parent mesh not found ${linkedMesh.parent}`);
                }

                linkedMesh.mesh.setParentMesh(parent);
                linkedMesh.mesh.updateRegion();
            }
            this.linkedMeshes.length = 0;

            // Events
            n = input.readInt(true);
            for (let i = 0; i < n; i++) {
                const name = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                if (!name) {
                    throw new Error("[Spine]: Event name must not be null");
                }
                const data = new spine.EventData(name);

                data.intValue = input.readInt(false);
                data.floatValue = input.readFloat();
                data.stringValue = input.readString();
                if (this.ver.minor > 6) {
                    data.audioPath = input.readString();
                    if (data.audioPath !== null) {
                        data.volume = input.readFloat();
                        data.balance = input.readFloat();
                    }
                }

                skeletonData.events.push(data);
            }

            //Animations
            if (this.ver.minor > 5) {
                n = input.readInt(true);
                for (let i = 0; i < n; i++) {
                    const name = input.readString();
                    if (!name) {
                        throw new Error("[Spine]: Animation name must not be null");
                    }
                    skeletonData.animations.push(this.readAnimation(input, name, skeletonData));
                }
            }

            return skeletonData;
        }

        readSkin(input, skeletonData, skinName, nonessential) {
            const slotCount = input.readInt(true);
            if (slotCount === 0) {
                return null;
            }

            const skin = new spine.Skin(skinName);
            for (let i = 0; i < slotCount; i++) {
                const slotIndex = input.readInt(true);
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const name = input.readString();
                    if (!name) {
                        throw new Error("[Spine]: Attachment name must not be null.");
                    }
                    const attachment = this.readAttachment(input, skeletonData, skin, slotIndex, name, nonessential);
                    if (attachment !== null) {
                        skin.setAttachment(slotIndex, name, attachment)
                    }
                }
            }
            return skin;
        }

        readSkin_3_8(input, skeletonData, defaultSkin, nonessential) {
            let skin = null;
            let slotCount = 0;

            if (defaultSkin) {
                slotCount = input.readInt(true);
                if (slotCount === 0) {
                    return null;
                }
                skin = new spine.Skin("default");
            } else {
                const name = input.readString();
                if (!name) {
                    throw new Error("[Spine]: Skin name must not be null.");
                }

                skin = new spine.Skin(name);
                skin.bones.length = input.readInt(true);

                for (let i = 0, n = skin.bones.length; i < n; i++) {
                    skin.bones[i] = skeletonData.bones[input.readInt(true)];
                }

                for (let i = 0, n = input.readInt(true); i < n; i++) {
                    skin.constraints.push(skeletonData.ikConstraints[input.readInt(true)]);
                }

                for (let i = 0, n = input.readInt(true); i < n; i++) {
                    skin.constraints.push(skeletonData.transformConstraints[input.readInt(true)]);
                }

                for (let i = 0, n = input.readInt(true); i < n; i++) {
                    skin.constraints.push(skeletonData.pathConstraints[input.readInt(true)]);
                }

                slotCount = input.readInt(true);
            }

            for (let i = 0; i < slotCount; i++) {
                const slotIndex = input.readInt(true);
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const name = input.readStringRef();
                    if (!name) {
                        throw new Error("[Spine]: Attachment name must not be null.");
                    }
                    const attachment = this.readAttachment(input, skeletonData, skin, slotIndex, name, nonessential);
                    if (attachment !== null) {
                        skin.setAttachment(slotIndex, name, attachment);
                    }
                }
            }

            return skin;
        }

        readAttachment(input, skeletonData, skin, slotIndex, attachmentName, nonessential) {
            const scale = this.scale;

            const name = (this.ver.minor > 7 ? input.readStringRef() : input.readString()) ?? attachmentName;

            const typeIndex = input.readByte();
            switch (typeIndex) {
                case 0: { // Region
                    let path = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                    const rotation = input.readFloat();
                    const x = input.readFloat();
                    const y = input.readFloat();
                    const scaleX = input.readFloat();
                    const scaleY = input.readFloat();
                    const width = input.readFloat();
                    const height = input.readFloat();
                    const color = input.readInt32();

                    if (!path) {
                        path = name;
                    }

                    const region = this.attachmentLoader.newRegionAttachment(skin, name, path, null);
                    if (!region) {
                        return null;
                    }

                    region.path = path;
                    region.x = x * scale;
                    region.y = y * scale;
                    region.scaleX = scaleX;
                    region.scaleY = scaleY;
                    region.rotation = rotation;
                    region.width = width * scale;
                    region.height = height * scale;
                    spine.Color.rgba8888ToColor(region.color, color);
                    // CHECK
                    region.updateRegion();

                    return region;
                }
                case 1: { // Bounding Box
                    const vertexCount = input.readInt(true);
                    const vertices = this.readVertices(input, vertexCount);
                    const color = nonessential ? input.readInt32() : 0;

                    const box = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
                    if (!box) {
                        return null;
                    }

                    box.worldVerticesLength = vertexCount << 1;
                    box.vertices = vertices.vertices;
                    box.bones = vertices.bones;
                    if (nonessential) {
                        spine.Color.rgba8888ToColor(box.color, color);
                    }

                    return box;
                }
                case 2: { // Mesh
                    let path = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                    const color = input.readInt32();
                    const vertexCount = input.readInt(true);
                    const uvs = this.readFloatArray(input, vertexCount << 1, 1);
                    const triangles = this.readShortArray(input);
                    const vertices = this.readVertices(input, vertexCount);
                    const hullLength = input.readInt(true);
                    let edges = [];
                    let width = 0;
                    let height = 0;

                    if (nonessential) {
                        edges = this.readShortArray(input);
                        width = input.readFloat();
                        height = input.readFloat();
                    }

                    if (!path) {
                        path = name;
                    }

                    const mesh = this.attachmentLoader.newMeshAttachment(skin, name, path, null);
                    if (!mesh) {
                        return null;
                    }

                    mesh.path = path;
                    spine.Color.rgba8888ToColor(mesh.color, color);
                    mesh.bones = vertices.bones;
                    mesh.vertices = vertices.vertices;
                    mesh.worldVerticesLength = vertexCount << 1;
                    mesh.triangles = triangles;
                    mesh.regionUVs = uvs;
                    // CHECK
                    mesh.updateRegion();
                    mesh.hullLength = hullLength << 1;

                    if (nonessential) {
                        mesh.edges = edges;
                        mesh.width = width;
                        mesh.height = height;
                    }

                    return mesh;
                }
                case 3: { // Linked Mesh
                    let path = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                    const color = input.readInt32();
                    const skinName = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                    const parent = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                    // Become inherit timeline
                    const inheritDeform = input.readBoolean();
                    let width = 0;
                    let height = 0;

                    if (nonessential) {
                        width = input.readFloat();
                        height = input.readFloat();
                    }

                    if (!path) {
                        path = name;
                    }

                    const mesh = this.attachmentLoader.newMeshAttachment(skin, name, path, null);
                    if (!mesh) {
                        return null;
                    }

                    spine.Color.rgba8888ToColor(mesh.color, color);
                    if (nonessential) {
                        mesh.width = width * scale;
                        mesh.height = height * scale;
                    }

                    this.linkedMeshes.push(new LinkedMesh(mesh, skinName, slotIndex, parent, inheritDeform));

                    return mesh;
                }
                case 4: { // Path
                    const closed = input.readBoolean();
                    const constantSpeed = input.readBoolean();
                    const vertexCount = input.readInt(true);
                    const vertices = this.readVertices(input, vertexCount);
                    const lengths = spine.Utils.newArray(vertexCount / 3, 0);

                    for (let i = 0; i < lengths.length; i++) {
                        lengths[i] = input.readFloat() * scale;
                    }

                    const color = nonessential ? input.readInt32() : 0;

                    const path = this.attachmentLoader.newPathAttachment(skin, name);
                    if (!path) {
                        return null;
                    }

                    path.closed = closed;
                    path.constantSpeed = constantSpeed;
                    path.worldVerticesLength = vertexCount << 1;
                    path.vertices = vertices.vertices;
                    path.bones = vertices.bones;
                    path.lengths = lengths;
                    if (nonessential) {
                        spine.Color.rgba8888ToColor(path.color, color);
                    }

                    return path;
                }
                case 5: { // Point
                    const rotation = input.readFloat();
                    const x = input.readFloat();
                    const y = input.readFloat();
                    const color = nonessential ? input.readInt32() : 0;

                    const point = this.attachmentLoader.newPointAttachment(skin, name);
                    if (!point) {
                        return null;
                    }

                    point.x = x * scale;
                    point.y = y * scale;
                    point.rotation = rotation;
                    if (nonessential) {
                        spine.Color.rgba8888ToColor(point.color, color);
                    }

                    return point;
                }
                case 6: { // Clipping
                    const endSlotIndex = input.readInt(true);
                    const vertexCount = input.readInt(true);
                    const vertices = this.readVertices(input, vertexCount);
                    const color = nonessential ? input.readInt32() : 0;

                    const clip = this.attachmentLoader.newClippingAttachment(skin, name);
                    if (!clip) {
                        return null;
                    }

                    clip.endSlot = skeletonData.slots[endSlotIndex];
                    clip.worldVerticesLength = vertexCount << 1;
                    clip.vertices = vertices.vertices;
                    clip.bones = vertices.bones;
                    if (nonessential) {
                        spine.Color.rgba8888ToColor(clip.color, color);
                    }

                    return clip;
                }
            }
            return null;
        }

        readVertices(input, vertexCount) {
            const verticesLength = vertexCount << 1;
            const vertices = new Vertices();
            const scale = this.scale;

            if (!input.readBoolean()) {
                vertices.vertices = this.readFloatArray(input, verticesLength, scale);
                return vertices;
            }

            const weights = [];
            const bonesArray = [];

            for (let i = 0; i < vertexCount; i++) {
                const boneCount = input.readInt(true);
                bonesArray.push(boneCount);
                for (let ii = 0; ii < boneCount; ii++) {
                    bonesArray.push(input.readInt(true));
                    weights.push(input.readFloat() * scale);
                    weights.push(input.readFloat() * scale);
                    weights.push(input.readFloat());
                }
            }

            vertices.vertices = new Float32Array(weights);
            vertices.bones = bonesArray;

            return vertices;
        }

        readFloatArray(input, n, scale) {
            const array = new Array(n);

            if (scale === 1) {
                for (let i = 0; i < n; i++) {
                    array[i] = input.readFloat();
                }
            } else {
                for (let i = 0; i < n; i++) {
                    array[i] = input.readFloat() * scale;
                }
            }
            return array;
        }

        readShortArray(input) {
            const n = input.readInt(true);
            const array = new Array(n);

            for (let i = 0; i < n; i++) {
                array[i] = input.readShort();
            }

            return array;
        }

        readAnimation(input, name, skeletonData) {

            const timelines = [];
            const scale = this.scale;
            let tempColor1 = new spine.Color();
            let tempColor2 = new spine.Color();

            // Slot timelines
            for (let i = 0, n = input.readInt(true); i < n; i++) {
                const slotIndex = input.readInt(true);
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const timelineType = input.readByte();
                    const frameCount = input.readInt(true);
                    const frameLast = frameCount - 1;
                    switch (timelineType) {
                        case 0: { // Slot Attachment
                            const timeline = new spine.AttachmentTimeline(frameCount, slotIndex);
                            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                                timeline.setFrame(frameIndex, input.readFloat(), this.ver.minor > 7 ? input.readStringRef() : input.readString());
                            }
                            timelines.push(timeline);
                            break;
                        }
                        case 1: { // Slot Color
                            const animationData = [];
                            let bezierCount = 0;
                            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                                const time = input.readFloat();
                                spine.Color.rgba8888ToColor(tempColor1, input.readInt32());
                                const animation = {
                                    r: tempColor1.r,
                                    g: tempColor1.g,
                                    b: tempColor1.b,
                                    a: tempColor1.a,
                                    time,
                                    curveType: 0,
                                    x1: 0,
                                    x2: 1,
                                    y1: 0,
                                    y2: 1
                                };
                                if (frameIndex !== frameLast) {
                                    animation.curveType = input.readByte();
                                    if (animation.curveType === 2) {
                                        bezierCount += 4;
                                        animation.x1 = input.readFloat();
                                        animation.y1 = input.readFloat();
                                        animation.x2 = input.readFloat();
                                        animation.y2 = input.readFloat();
                                    }
                                }
                                animationData.push(animation);
                            }

                            const timeline = new spine.RGBATimeline(frameCount, bezierCount, slotIndex);
                            let bezier = 0;
                            for (const [frame, data] of animationData.entries()) {
                                timeline.setFrame(frame, data.time, data.r, data.g, data.b, data.a);
                                if (frame === frameLast) {
                                    break;
                                }
                                switch (data.curveType) {
                                    case 1:
                                        timeline.setStepped(frame);
                                        break;
                                    case 2:
                                        const data2 = animationData[frame + 1];

                                        let curve = getCurve(data, data2, "r");
                                        timeline.setBezier(bezier++, frame, 0, data.time, data.r, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.r);

                                        curve = getCurve(data, data2, "g");
                                        timeline.setBezier(bezier++, frame, 1, data.time, data.g, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.g);

                                        curve = getCurve(data, data2, "b");
                                        timeline.setBezier(bezier++, frame, 2, data.time, data.b, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.b);

                                        curve = getCurve(data, data2, "a");
                                        timeline.setBezier(bezier++, frame, 3, data.time, data.a, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.a);
                                }
                            }
                            timelines.push(timeline);



                            break;
                        }
                        case 2: { // Slot Color 2
                            const animationData = [];
                            let bezierCount = 0;
                            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                                const time = input.readFloat();
                                spine.Color.rgba8888ToColor(tempColor1, input.readInt32());
                                spine.Color.rgb888ToColor(tempColor2, input.readInt32())
                                const animation = {
                                    r: tempColor1.r,
                                    g: tempColor1.g,
                                    b: tempColor1.b,
                                    a: tempColor1.a,
                                    r2: tempColor2.r,
                                    g2: tempColor2.g,
                                    b2: tempColor2.b,
                                    time,
                                    curveType: 0,
                                    x1: 0,
                                    x2: 1,
                                    y1: 0,
                                    y2: 1
                                };
                                if (frameIndex !== frameLast) {
                                    animation.curveType = input.readByte();
                                    if (animation.curveType === 2) {
                                        bezierCount += 7;
                                        animation.x1 = input.readFloat();
                                        animation.y1 = input.readFloat();
                                        animation.x2 = input.readFloat();
                                        animation.y2 = input.readFloat();
                                    }
                                }
                                animationData.push(animation);
                            }

                            const timeline = new spine.RGBA2Timeline(frameCount, bezierCount, slotIndex);
                            let bezier = 0;
                            for (const [frame, data] of animationData.entries()) {
                                timeline.setFrame(frame, data.time, data.r, data.g, data.b, data.a, data.r2, data.g2, data.b2);
                                if (frame === frameLast) {
                                    break;
                                }
                                switch (data.curveType) {
                                    case 1:
                                        timeline.setStepped(frame);
                                        break;
                                    case 2:
                                        const data2 = animationData[frame + 1];
                                        let curve = getCurve(data, data2, "r");
                                        timeline.setBezier(bezier++, frame, 0, data.time, data.r, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.r);

                                        curve = getCurve(data, data2, "g");
                                        timeline.setBezier(bezier++, frame, 1, data.time, data.g, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.g);

                                        curve = getCurve(data, data2, "b");
                                        timeline.setBezier(bezier++, frame, 2, data.time, data.b, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.b);

                                        curve = getCurve(data, data2, "a");
                                        timeline.setBezier(bezier++, frame, 3, data.time, data.a, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.a);

                                        curve = getCurve(data, data2, "r2");
                                        timeline.setBezier(bezier++, frame, 4, data.time, data.r2, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.r2);

                                        curve = getCurve(data, data2, "g2");
                                        timeline.setBezier(bezier++, frame, 5, data.time, data.g2, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.g2);

                                        curve = getCurve(data, data2, "b2");
                                        timeline.setBezier(bezier++, frame, 6, data.time, data.b2, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.b2);
                                }
                            }
                            timelines.push(timeline);
                            break;
                        }
                    }
                }
            }

            // Bone Timelines
            for (let i = 0, n = input.readInt(true); i < n; i++) {
                const boneIndex = input.readInt(true);
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const timelineType = input.readByte();
                    const frameCount = input.readInt(true);
                    switch (timelineType) {
                        case 0:
                            timelines.push(getTimeline1(spine.RotateTimeline, input, frameCount, boneIndex, 1));
                            break;
                        case 1:
                            timelines.push(getTimeline2(spine.TranslateTimeline, input, frameCount, boneIndex, scale));
                            break;
                        case 2:
                            timelines.push(getTimeline2(spine.ScaleTimeline, input, frameCount, boneIndex, 1));
                            break;
                        case 3:
                            timelines.push(getTimeline2(spine.ShearTimeline, input, frameCount, boneIndex, 1));
                            break;
                    }
                }
            }

            // IK constraint timelines
            for (let i = 0, n = input.readInt(true); i < n; i++) {
                const index = input.readInt(true);
                const frameCount = input.readInt(true);

                const animationData = [];
                const frameLast = frameCount - 1;
                let bezierCount = 0;
                for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                    const time = input.readFloat();
                    const mix = input.readFloat();
                    let softness = 0;
                    if (this.ver.minor > 7) {
                        softness = input.readFloat() * scale;
                    }
                    const bendDirection = input.readByte();
                    let compress = false;
                    let stretch = false;
                    if (this.ver.minor > 6) {
                        compress = input.readBoolean();
                        stretch = input.readBoolean();
                    }
                    const animation = {
                        time,
                        mix,
                        softness,
                        bendDirection,
                        compress,
                        stretch,
                        curveType: 0,
                        x1: 0,
                        x2: 1,
                        y1: 0,
                        y2: 1
                    }
                    if (frameIndex < frameLast) {
                        animation.curveType = input.readByte();
                        if (animation.curveType === 2) {
                            bezierCount += this.ver.minor > 7 ? 2 : 1;
                            animation.x1 = input.readFloat();
                            animation.y1 = input.readFloat();
                            animation.x2 = input.readFloat();
                            animation.y2 = input.readFloat();
                        }
                    }
                    animationData.push(animation);
                }
                const timeline = new spine.IkConstraintTimeline(frameCount, bezierCount, index);
                let bezier = 0;
                for (const [frame, data] of animationData.entries()) {
                    timeline.setFrame(frame, data.time, data.mix, data.softness, data.bendDirection, data.compress, data.stretch);
                    if (frame === frameLast) {
                        break;
                    }
                    switch (data.curveType) {
                        case 1:
                            timeline.setStepped(frame);
                            break;
                        case 2:
                            const data2 = animationData[frame + 1];

                            let curve = getCurve(data, data2, "mix");
                            timeline.setBezier(bezier++, frame, 0, data.time, data.mix, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.mix);

                            if (this.ver.minor > 7) {
                                curve = getCurve(data, data2, "softness");
                                timeline.setBezier(bezier++, frame, 1, data.time, data.softness, curve.x1, curve.y1 * scale, curve.x2, curve.y2 * scale, data2.time, data2.softness);
                            }

                            break;
                    }
                }
                timelines.push(timeline);
            }

            // Transform constraint timelines
            for (let i = 0, n = input.readInt(true); i < n; i++) {
                const index = input.readInt(true);
                const frameCount = input.readInt(true);

                const animationData = [];
                const frameLast = frameCount - 1;
                let bezierCount = 0;
                for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                    const animation = {
                        time: input.readFloat(),
                        rotate: input.readFloat(),
                        translate: input.readFloat(),
                        scale: input.readFloat(),
                        shear: input.readFloat(),
                        curveType: 0,
                        x1: 0,
                        x2: 1,
                        y1: 0,
                        y2: 1
                    }
                    if (frameIndex < frameLast) {
                        animation.curveType = input.readByte();
                        if (animation.curveType === 2) {
                            bezierCount += 6;
                            animation.x1 = input.readFloat();
                            animation.y1 = input.readFloat();
                            animation.x2 = input.readFloat();
                            animation.y2 = input.readFloat();
                        }
                    }
                    animationData.push(animation);
                }
                const timeline = new spine.TransformConstraintTimeline(frameCount, bezierCount, index);
                let bezier = 0;
                for (const [frame, data] of animationData.entries()) {
                    timeline.setFrame(frame, data.time, data.rotate, data.translate, data.translate, data.scale, data.scale, data.shear);
                    if (frame === frameLast) {
                        break;
                    }
                    switch (data.curveType) {
                        case 1:
                            timeline.setStepped(frame);
                            break;
                        case 2:
                            const data2 = animationData[frame + 1];

                            let curve = getCurve(data, data2, "rotate");
                            timeline.setBezier(bezier++, frame, 0, data.time, data.rotate, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.rotate);

                            curve = getCurve(data, data2, "translate");
                            timeline.setBezier(bezier++, frame, 1, data.time, data.translate, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.translate);
                            timeline.setBezier(bezier++, frame, 2, data.time, data.translate, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.translate);

                            curve = getCurve(data, data2, "scale");
                            timeline.setBezier(bezier++, frame, 3, data.time, data.scale, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.scale);
                            timeline.setBezier(bezier++, frame, 4, data.time, data.scale, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.scale);

                            curve = getCurve(data, data2, "shear");
                            timeline.setBezier(bezier++, frame, 5, data.time, data.shear, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.shear);
                            break;
                    }
                }
                timelines.push(timeline);
            }

            // Path constraint timelines
            for (let i = 0, n = input.readInt(true); i < n; i++) {
                const index = input.readInt(true);
                const data = skeletonData.pathConstraints[index];
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const timelineType = input.readByte();
                    const frameCount = input.readInt(true);
                    switch (timelineType) {
                        case 0:
                            timelines.push(getTimeline1(spine.PathConstraintPositionTimeline, input, frameCount, index, data.positionMode === PositionMode.Fixed ? scale : 1));
                            break;
                        case 1:
                            timelines.push(getTimeline1(spine.PathConstraintSpacingTimeline, input, frameCount, index, data.spacingMode === SpacingMode.Fixed || data.spacingMode === SpacingMode.Length ? scale : 1));
                            break;
                        case 2:
                            const animationData = [];
                            const frameLast = frameCount - 1;
                            let bezierCount = 0;
                            for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                                const animation = {
                                    time: input.readFloat(),
                                    value: input.readFloat(),
                                    value2: input.readFloat(),
                                    curveType: 0,
                                    x1: 0,
                                    x2: 1,
                                    y1: 0,
                                    y2: 1
                                }
                                if (frameIndex < frameLast) {
                                    animation.curveType = input.readByte();
                                    if (animation.curveType === 2) {
                                        bezierCount += 3;
                                        animation.x1 = input.readFloat();
                                        animation.y1 = input.readFloat();
                                        animation.x2 = input.readFloat();
                                        animation.y2 = input.readFloat();
                                    }
                                }
                                animationData.push(animation);
                            }
                            const timeline = new spine.PathConstraintMixTimeline(frameCount, bezierCount, index);
                            let bezier = 0;
                            for (const [frame, data] of animationData.entries()) {
                                timeline.setFrame(frame, data.time, data.value, data.value2, data.value2);
                                if (frame === frameLast) {
                                    break;
                                }
                                switch (data.curveType) {
                                    case 1:
                                        timeline.setStepped(frame);
                                        break;
                                    case 2:
                                        const data2 = animationData[frame + 1];

                                        let curve = getCurve(data, data2, "value");
                                        timeline.setBezier(bezier++, frame, 0, data.time, data.value, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.value);

                                        curve = getCurve(data, data2, "value2");
                                        timeline.setBezier(bezier++, frame, 1, data.time, data.value2, curve.x1, curve.y1 * scale, curve.x2, curve.y2 * scale, data2.time, data2.value2);
                                        timeline.setBezier(bezier++, frame, 2, data.time, data.value2, curve.x1, curve.y1 * scale, curve.x2, curve.y2 * scale, data2.time, data2.value2);
                                        break;
                                }
                            }
                            timelines.push(timeline);
                            break;
                    }
                }
            }

            // Deform timelines
            for (let i = 0, n = input.readInt(true); i < n; i++) {
                const skin = skeletonData.skins[input.readInt(true)];
                for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                    const slotIndex = input.readInt(true);
                    for (let iii = 0, nnn = input.readInt(true); iii < nnn; iii++) {
                        const attachmentName = this.ver.minor > 7 ? input.readStringRef() : input.readString();
                        if (!attachmentName) {
                            throw new Error("[Spine]: Deform attachment name must not be null.");
                        }
                        const attachment = skin.getAttachment(slotIndex, attachmentName);

                        const weighted = attachment.bones != null;
                        const vertices = attachment.vertices;
                        const deformLength = weighted ? vertices.length / 3 * 2 : vertices.length;

                        const frameCount = input.readInt(true);
                        const animationData = [];
                        const frameLast = frameCount - 1;
                        let bezierCount = 0;
                        for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                            const time = input.readFloat();
                            let deform;
                            let end = input.readInt(true);
                            if (end === 0) {
                                deform = weighted ? spine.Utils.newFloatArray(deformLength) : vertices;
                            } else {
                                deform = spine.Utils.newFloatArray(deformLength);
                                const start = input.readInt(true);
                                end += start;

                                if (scale === 1) {
                                    for (let v = start; v < end; v++) {
                                        deform[v] = input.readFloat();
                                    }
                                } else {
                                    for (let v = start; v < end; v++) {
                                        deform[v] = input.readFloat() * scale;
                                    }
                                }

                                if (!weighted) {
                                    for (let v = 0, vn = deform.length; v < vn; v++) {
                                        deform[v] += vertices[v];
                                    }
                                }
                            }

                            const animation = {
                                time,
                                deform,
                                lazyTemp: 1,
                                curveType: 0,
                                x1: 0,
                                x2: 1,
                                y1: 0,
                                y2: 1
                            }
                            if (frameIndex < frameLast) {
                                animation.curveType = input.readByte();
                                if (animation.curveType === 2) {
                                    bezierCount += 1;
                                    animation.x1 = input.readFloat();
                                    animation.y1 = input.readFloat();
                                    animation.x2 = input.readFloat();
                                    animation.y2 = input.readFloat();
                                }
                            }
                            animationData.push(animation);
                        }


                        const timeline = new spine.DeformTimeline(frameCount, bezierCount, slotIndex, attachment);
                        let bezier = 0;
                        for (const [frame, data] of animationData.entries()) {
                            timeline.setFrame(frame, data.time, data.deform);
                            if (frame === frameLast) {
                                break;
                            }
                            switch (data.curveType) {
                                case 1:
                                    timeline.setStepped(frame);
                                    break;
                                case 2:
                                    const data2 = animationData[frame + 1];

                                    let curve = getCurve(data, data2, "lazyTemp");
                                    timeline.setBezier(bezier++, frame, 0, data.time, 0, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, 1);
                                    break;
                            }
                        }
                        timelines.push(timeline);

                    }
                }
            }

            // Draw order timelines
            const drawOrderCount = input.readInt(true);
            if (drawOrderCount > 0) {
                const timeline = new spine.DrawOrderTimeline(drawOrderCount);
                const slotCount = skeletonData.slots.length;
                for (let i = 0; i < drawOrderCount; i++) {
                    const time = input.readFloat();

                    const offsetCount = input.readInt(true);
                    const drawOrder = spine.Utils.newArray(slotCount, 0);
                    for (let ii = slotCount - 1; ii >= 0; ii--) {
                        drawOrder[ii] = -1;
                    }

                    const unchanged = spine.Utils.newArray(slotCount - offsetCount, 0);
                    let originalIndex = 0;
                    let unchangedIndex = 0;
                    for (let ii = 0; ii < offsetCount; ii++) {
                        const slotIndex = input.readInt(true);
                        while (originalIndex != slotIndex) {
                            unchanged[unchangedIndex++] = originalIndex++;
                        }
                        drawOrder[originalIndex + input.readInt(true)] = originalIndex++;
                    }

                    while (originalIndex < slotCount) {
                        unchanged[unchangedIndex++] = originalIndex++;
                    }

                    for (let ii = slotCount - 1; ii >= 0; ii--) {
                        if (drawOrder[ii] === -1) {
                            drawOrder[ii] = unchanged[--unchangedIndex];
                        }
                    }

                    timeline.setFrame(i, time, drawOrder);
                }
                timelines.push(timeline);
            }

            // Event timelines
            let eventCount = input.readInt(true);
            if (eventCount > 0) {
                const timeline = new spine.EventTimeline(eventCount);
                for (let i = 0; i < eventCount; i++) {
                    const time = input.readFloat();
                    const eventData = skeletonData.events[input.readInt(true)];
                    const event = new spine.Event(time, eventData);
                    event.intValue = input.readInt(true);
                    event.floatValue = input.readFloat();
                    event.stringValue = input.readBoolean() ? input.readString() : eventData.stringValue;
                    if (eventData.audioPath != null) {
                        event.volume = input.readFloat();
                        event.balance = input.readFloat();
                    }
                    timeline.setFrame(i, event);
                }
                timelines.push(timeline);
            }

            let duration = 0;
            for (let i = 0, n = timelines.length; i < n; i++) {
                duration = Math.max(duration, timelines[i].getDuration());
            }
            return new spine.Animation(name, timelines, duration);
        }
    }

    class LinkedMesh {
        parent;
        skinName;
        slotIndex;
        mesh;
        inheritTimeline;

        constructor(mesh, skinIndex, slotIndex, parent, inheritDeform) {
            this.mesh = mesh;
            this.skinName = skinIndex;
            this.slotIndex = slotIndex;
            this.parent = parent;
            this.inheritTimeline = inheritDeform;
        }
    }

    class Vertices {
        bones = null;
        vertices = []
        constructor() { }
    }

    function getTimeline1(ctor, input, frameCount, boneIndex, scale) {
        const animationData = [];
        const frameLast = frameCount - 1;
        let bezierCount = 0;
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const animation = {
                time: input.readFloat(),
                value: input.readFloat() * scale,
                curveType: 0,
                x1: 0,
                x2: 1,
                y1: 0,
                y2: 1
            }
            if (frameIndex < frameLast) {
                animation.curveType = input.readByte();
                if (animation.curveType === 2) {
                    bezierCount += 1;
                    animation.x1 = input.readFloat();
                    animation.y1 = input.readFloat();
                    animation.x2 = input.readFloat();
                    animation.y2 = input.readFloat();
                }
            }
            if (ctor === spine.RotateTimeline) {
                if (animation.value > 225) {
                    animation.value = round(animation.value - 360, 2);
                } else if (animation.value < -225) {
                    animation.value = round(animation.value + 360, 2);
                }
            }
            animationData.push(animation);
        }
        const timeline = new ctor(frameCount, bezierCount, boneIndex);
        let bezier = 0;
        for (const [frame, data] of animationData.entries()) {
            timeline.setFrame(frame, data.time, data.value);
            if (frame === frameLast) {
                break;
            }
            switch (data.curveType) {
                case 1:
                    timeline.setStepped(frame);
                    break;
                case 2:
                    const data2 = animationData[frame + 1];

                    let curve = getCurve(data, data2, "value");
                    timeline.setBezier(bezier++, frame, 0, data.time, data.value, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.value);
                    break;
            }
        }
        return timeline;
    }



    function getTimeline2(ctor, input, frameCount, boneIndex, scale) {
        const animationData = [];
        const frameLast = frameCount - 1;
        let bezierCount = 0;
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
            const animation = {
                time: input.readFloat(),
                value: input.readFloat() * scale,
                value2: input.readFloat() * scale,
                curveType: 0,
                x1: 0,
                x2: 1,
                y1: 0,
                y2: 1
            }
            if (frameIndex < frameLast) {
                animation.curveType = input.readByte();
                if (animation.curveType === 2) {
                    bezierCount += 2;
                    animation.x1 = input.readFloat();
                    animation.y1 = input.readFloat();
                    animation.x2 = input.readFloat();
                    animation.y2 = input.readFloat();
                }
            }
            animationData.push(animation);
        }
        const timeline = new ctor(frameCount, bezierCount, boneIndex);
        let bezier = 0;
        for (const [frame, data] of animationData.entries()) {
            timeline.setFrame(frame, data.time, data.value, data.value2);
            if (frame === frameLast) {
                break;
            }
            switch (data.curveType) {
                case 1:
                    timeline.setStepped(frame);
                    break;
                case 2:
                    const data2 = animationData[frame + 1];

                    let curve = getCurve(data, data2, "value");
                    timeline.setBezier(bezier++, frame, 0, data.time, data.value, curve.x1, curve.y1, curve.x2, curve.y2, data2.time, data2.value);

                    curve = getCurve(data, data2, "value2");
                    timeline.setBezier(bezier++, frame, 1, data.time, data.value2, curve.x1, curve.y1 * scale, curve.x2, curve.y2 * scale, data2.time, data2.value2);
                    break;
            }
        }
        return timeline;
    }

    function getVer(ver) {
        const split = ver.split(".");
        const [patch, extra] = split[2].split("-");

        return {
            major: Number(split[0]),
            minor: Number(split[1]),
            patch: Number(patch),
            extra
        }
    }

    function getCurve(curCurve, nextCurve, valueKey) {
        const duration = nextCurve.time - curCurve.time;
        const value = curCurve[valueKey];
        const difference = nextCurve[valueKey] - value;

        const x1 = curCurve.time + (curCurve.x1 * duration);
        const y1 = value + (difference * curCurve.y1);
        const x2 = curCurve.time + (curCurve.x2 * duration);
        const y2 = value + (difference * curCurve.y2);

        return { x1, y1, x2, y2 };
    }

    function b64ToUint8(b64) {
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    class SpineGroup {
        renderables;
        constructor(models) {
            this.renderables = models;
        }

        update(delta) {
            for (const model of this.renderables) {
                model.update(delta);
            }
        }

        setAnimation({ animationName, loop = true, track = 0 }) {
            for (const model of this.renderables) {
                model.setAnimation({ animationName, loop, track });
            }
        }

        set x(value) {
            for (const model of this.renderables) {
                model.x = value;
            }
        }

        set y(value) {
            for (const model of this.renderables) {
                model.y = value;
            }
        }

        position(x, y = x) {
            for (const model of this.renderables) {
                model.position(x, y);
            }
        }

        set scaleX(value) {
            for (const model of this.renderables) {
                model.scaleX = value;
            }
        }

        set scaleY(value) {
            for (const model of this.renderables) {
                model.scaleY = value;
            }
        }

        scale(x, y = x) {
            for (const model of this.renderables) {
                model.scale(x, y)
            }
        }

        set pma(premultiply) {
            for (const model of this.renderables) {
                model.pma = premultiply;
            }
        }

        set debug(value) {
            for (const model of this.renderables) {
                model.debug = value;
            }
        }

        destroy() {
            for (const model of this.renderables) {
                model.destroy();
            }
        }

        static async from(dataArray) {
            const models = []

            for (const data of dataArray) {
                const atlas = new spine.TextureAtlas(data.atlas);
                const atlasLoader = new spine.AtlasAttachmentLoader(atlas);

                let imageFailed = false;
                for (const page of atlas.pages) {
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = () => {
                            page.setTexture(new spine.GLTexture(scene.spine.ctx, img));
                            resolve();
                        }
                        img.onerror = () => {
                            imageFailed = true;
                            reject();
                        }
                        img.src = data.image
                    });
                }
                if (imageFailed) {
                    return undefined;
                }

                version3Conversion(data.skel);
                const skeletonLoader = new spine.SkeletonJson(atlasLoader);
                const skeletonData = skeletonLoader.readSkeletonData(data.skel);
                const skeleton = new spine.Skeleton(skeletonData);
                skeleton.setSkinByName("default");

                models.push(new SpineModel(skeleton, atlas));
            }

            return new SpineGroup(models);
        }
    }

    class SpineModel {
        destroyed = false;
        leaving = false;
        pma = false;
        debug = false;
        _removedSlots = [];

        constructor(skeleton, atlas) {
            this.skeleton = skeleton;
            this.atlas = atlas;

            this.bounds = calculateSetupPoseBounds(skeleton);
            this.animationStateData = new spine.AnimationStateData(skeleton.data);
            this.animationStateData.defaultMix = 0.2;
            this.animationState = new spine.AnimationState(this.animationStateData);
        }

        set removableSlots(arr) {
            this._removedSlots.length = 0;
            for (const slotName of arr) {
                for (const slot of this.skeleton.slots) {
                    if (slot.data.name === slotName) {
                        this._removedSlots.push(slot)
                        break;
                    }
                }
            }
        }

        update(delta) {
            this.animationState.update(delta);
            this.animationState.apply(this.skeleton);
            this.skeleton.updateWorldTransform(spine.Physics.update);
            if (prefs.scene.spineMods) {
                for (const slot of this._removedSlots) {
                    slot.setAttachment(null);
                }
            }
        }

        setAnimation({ animationName, loop = true, track = 0 }) {
            this.animationState.setAnimation(track, animationName, loop);
        }

        set x(value) {
            this.skeleton.x = value;
        }

        set y(value) {
            this.skeleton.y = value;
        }

        position(x, y = x) {
            this.skeleton.x = x;
            this.skeleton.y = y;
        }

        set scaleX(value) {
            this.skeleton.scaleX = value;
        }

        set scaleY(value) {
            this.skeleton.scaleY = value;
        }

        scale(x, y = x) {
            this.skeleton.scaleX = x;
            this.skeleton.scaleY = y;
        }

        static async from(data) {
            const atlas = new spine.TextureAtlas(data.atlas);
            const atlasLoader = new spine.AtlasAttachmentLoader(atlas);

            let imageFailed = false;
            for (const page of atlas.pages) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                await new Promise((reolve, reject) => {
                    img.onload = () => {
                        const tex = new spine.GLTexture(scene.spine.ctx, img);
                        tex.setFilters(spine.TextureFilter.Linear, spine.TextureFilter.Linear);
                        page.setTexture(tex);
                        reolve();
                    }
                    img.onerror = () => {
                        imageFailed = true;
                        reject();
                    }
                    img.src = data.images[page.name];
                });
            }
            if (imageFailed) {
                return undefined;
            }

            const skeletonReader = new SkeletonBinaryUpgrader(atlasLoader);
            const skeletonData = skeletonReader.readSkeletonData(b64ToUint8(data.skel));
            const skeleton = new spine.Skeleton(skeletonData);
            skeleton.setSkinByName("default");

            return new SpineModel(skeleton, atlas)
        }

        destroy() {
            this.skeleton = null;
            this.atlas = null;
            this.animationState = null;
            this.animationStateData = null;
            this.bounds = null;
            this.destroyed = true;
        }
    }

    function calculateSetupPoseBounds(skeleton) {
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform(spine.Physics.update);
        let offset = new spine.Vector2();
        let size = new spine.Vector2();
        skeleton.getBounds(offset, size, []);
        return { offset: offset, size: size };
    }

    window.SpineModel = SpineModel;
    window.SpineGroup = SpineGroup;
})();