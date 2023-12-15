# Marching Cubes

## Authors
- Conor O'Malley
- [Nick Stuhldreher](https://www.nickst.dev/)


## Pipelines & Needed Resources

0. Noise Field Creation
    - Creates a 3D noise texture

    - (Input) Permutation Table Buffer
    - (Input) Noise Settings Buffer
    - (Output) texture3d\<float> Noise

1. Marching Cubes (Triangle Creation)
    - Runs the marching cubes algorithm on the noise texture

    - (Input) texture3d\<float> Noise
    - (Input) Settings Buffer
    - (Input) Triangulation LUT Buffer
    - (Input / Output) Storage Buffer for Indices
    - (Input / Output) Storage Buffer for Indirect Args
    - (Input / Output) Storage Buffer for Vertices

2. Rasterization and Rendering
    - Renders out the triangles with a basic shader

    - (Vertex Input) Vertex Buffer (position, normal)
    - (Index Input) Index Buffer
    - (Input) Render Settings

12. Debug Noise (optional, replaces 2)
    - Renders 2D slices of the noise texture to the screen
    - (Input) texture3d\<float> Noise
    - (Input) Settings Uniform Buffer



## TODO
```
- support window and resolution resizing during runtime (done)
- translate the noise and the mesh based on position, so that we have an endless space, shouldnt affect performance at all (done)
- add some procedural / interesting coloring / texturing (done)
- add this one fps counter library that is really clean looking (done)
- add additional sim settings (done)
- store vertex buffers as seperate, so that they can be packed tightly (done)
- add debug timing info (done)
- setup auto build (done)
```

## Final Notes
Ended up a bit more spaghetti'd than I'd like, but happy with the current state of it. Could gain some efficiency via frustrum culling or maybe rendering the noise offset by where the player is looking. The JavaScript object oriented style got a bit messy in the end, but it was a fun project to work on.

## BindGroups Overview
|                | BindGroup 0                          | BindGroup 1                                                                 | BindGroup 2  | BindGroup 3 |
|----------------|--------------------------------------|-----------------------------------------------------------------------------|--------------|-------------|
| Compute Noise  | PTable + Triangulation LUTs | Noise Texture + Noise Settings                                               |              |             |
| Marching Cubes | PTable + Triangulation LUTs | Noise Texture, Marching Cube Settings, IndirectArgs; Vertex, Normal, Index Buffers |              |             |
| Rendering      | Render Settings  |                                                                             |              |             |
| Debug Noise    | Noise Texture + Settings  |  Settings                                                              |              |             |