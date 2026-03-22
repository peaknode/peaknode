'use client'

import { useId, useState } from 'react'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'

import { Badge } from './badge'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from './command'
import { Label } from './label'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export const ComboboxMultiple = ({
  items,
  values,
  onChange,
}: {
  items: { value: string; label: string }[]
  values: string[]
  onChange: (values: string[]) => void
}) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)


  const toggleSelection = (value: string) => {
    // setSelectedValues(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]))
    onChange([...values, value])
  }

  const removeSelection = (value: string) => {
    // setSelectedValues(prev => prev.filter(v => v !== value))
    onChange(values.filter(v => v !== value))
  }

  const maxShownItems = 2
  const visibleItems = expanded ? values : values.slice(0, maxShownItems)
  const hiddenCount = values.length - visibleItems.length

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='h-auto min-h-8 w-full justify-between hover:bg-transparent'
          >
            <div className='flex flex-wrap items-center gap-1 pr-2.5'>
              {values.length > 0 ? (
                <>
                  {visibleItems.map(val => {
                    const item = items.find(c => c.value === val)

                    return item ? (
                      <Badge key={val} variant='outline' className='rounded-sm'>
                        {item?.label}
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-4'
                          onClick={e => {
                            e.stopPropagation()
                            removeSelection(val)
                          }}
                          asChild
                        >
                          <span>
                            <XIcon className='size-3' />
                          </span>
                        </Button>
                      </Badge>
                    ) : null
                  })}
                  {hiddenCount > 0 || expanded ? (
                    <Badge
                      variant='outline'
                      onClick={e => {
                        e.stopPropagation()
                        setExpanded(prev => !prev)
                      }}
                      className='rounded-sm'
                    >
                      {expanded ? 'Show Less' : `+${hiddenCount} more`}
                    </Badge>
                  ) : null}
                </>
              ) : (
                <span className='text-muted-foreground'>Select framework</span>
              )}
            </div>
            <ChevronsUpDownIcon className='text-muted-foreground/80 shrink-0' aria-hidden='true' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-(--radix-popper-anchor-width) p-0'>
          <Command>
            <CommandInput placeholder='Search framework...' />
            <CommandList>
              <CommandEmpty>No items found.</CommandEmpty>
              <CommandGroup>
                {items.map(item => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => toggleSelection(item.value)}
                  >
                    <span className='truncate'>{item.label}</span>
                    {values.includes(item.value) && <CheckIcon size={16} className='ml-auto' />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

